import {PubSub, Subscription} from '@google-cloud/pubsub';
import {CustomTransportStrategy, Server} from '@nestjs/microservices';

import {PubSubConfigInterface, CloudPubSubLogger} from '../interfaces/pub-sub-config.interface';
import {PubSubMessageInterface, CloudPubSubMessageData} from '../interfaces/pub-sub-message.interface';

const noop = () => undefined;

/**
 * Implementation of Google Cloud Pub/Sub as a `CustomTransportStrategy` for Nestjs
 * **MicroServices** system.
 *
 * @see https://cloud.google.com/pubsub/docs/overview
 * @see https://cloud.google.com/nodejs/docs/reference/pubsub/0.28.x/
 *
 * TODO: in order to open-source it for NestJs, we must use `this.loadPackage`
 * to load `@google-cloud/pubsub` dynamically instead of having it installed
 * in the dependenices of the project. Also, all types used from the package
 * should be duplicated into local types/interfaces.
 */
export class ServerPubSub extends Server implements CustomTransportStrategy {
  private readonly pubSubClient: PubSub;
  private readonly options: Required<PubSubConfigInterface>['options'];

  private readonly subscriptions: Subscription[];

  /** Overriden from base class `Server`: we want it re-assignable */
  private customLogger: CloudPubSubLogger;

  constructor(config: PubSubConfigInterface = {}) {
    super();
    const {clientConfig, options = {}} = config;

    if (options.defaultSubscription && !options.defaultTopic) {
      throw new Error('PubSub: Default subscription name provided without a topic');
    }
    this.options = options;
    this.subscriptions = [];
    this.pubSubClient = new PubSub(clientConfig);

    this.customLogger =
      options.enableLogger !== false ? options.logger : {debug: noop, info: noop, log: noop, warn: noop, error: noop};
  }

  /**
   * Initializes the default topic and subscription if they were
   * given to the constructor. Then notify the system that the
   * server is ready.
   *
   * @param callback Executed when the operation is complete.
   */
  async listen(callback: () => void) {
    if (this.options.defaultTopic) {
      await this.useDefaultTopic(this.options.defaultTopic);

      if (this.options.defaultSubscription) {
        await this.useDefaultSubscription(this.options.defaultTopic, this.options.defaultSubscription);
      }
    }
    callback();
  }

  /**
   * Closes all the current subscriptions: destroy the associated message stream,
   * and unregister any handler of `message` event.
   *
   * @return Resolves when all subscriptions have been closed, or rejects.
   */
  close() {
    this.customLogger.log('Closing connection...');
    return Promise.all(this.subscriptions.map(subscription => subscription.close()));
  }

  /**
   * Creates a topic in Pub/Sub.
   *
   * @param name Name of the target topic.
   * @param gaxOpts Optional options (see Google API extensions).
   *
   * @return Resolves on success, or rejects.
   */
  async createTopic(name: string, gaxOpts?: Parameters<PubSub['createTopic']>[1]) {
    this.customLogger.log(`Creating topic ${name}...`);

    try {
      await this.pubSubClient.createTopic(name, gaxOpts);
    } catch (err) {
      // error code 6: resource already existing
      if (err.code !== 6) {
        throw err;
      }
    }
  }

  /**
   * Creates a subscription to `topic` in Pub/Sub. If a subscription already
   * exists for the given `name`, a simple reference is created.
   *
   * As soon as the subscription is available, a listener is added
   * to event `message` so this strategy can handle it.
   *
   * @param topic Name of the topic to subscribe to.
   * @param name Name of the subscription.
   * @param options `CreateSubscriptionOptions` passed as-is to the Node.js client.
   *
   * @return Resolves on success, or rejects.
   */
  async createSubscription(topic: string, name: string, options?: Parameters<PubSub['createSubscription']>[2]) {
    let subscription: Subscription;
    this.customLogger.info(`creating subscription: ${name} to topic ${topic}`, {sub: name, topic});

    try {
      const results = await this.pubSubClient.createSubscription(topic, name, options);
      subscription = results[0];
    } catch (err) {
      // error code 6: resource already existing
      if (err.code !== 6) {
        throw err;
      }

      subscription = this.pubSubClient.subscription(name);

      /* After a topic is deleted, its subscriptions have the topic name "_deleted-topic_".
      https://cloud.google.com/pubsub/docs/admin#deleting_a_topic
      People tend to delete and recreate a topic with the same name... But do not think
      to delete and recreate their subscriptions (which cannot "switch" to the newly created
      topic).
      Topic name in Metadata is formatted as: `projects/<your-project>/topics/<topic-name>`
      */
      const metadata = await subscription.getMetadata();
      if (metadata.length > 0 && typeof metadata[0].topic === 'string' && !metadata[0].topic.endsWith(`/${topic}`)) {
        this.customLogger.warn(`subscription already bound to topic`, {topic: metadata[0].topic, sub: name});
      }
    }

    this.subscriptions.push(subscription);
    subscription.on('message', message => this.handleMessage(message, name));
  }

  /**
   * Create (or instantiate) a topic `topic`.
   *
   * @param topic Name of the topic to be created (or just instantiated, if existing).
   *
   * @return Resolves with an instance of `Topic`, or undefined. Any error will be logged but not rejected.
   */
  private async useDefaultTopic(topic: string) {
    try {
      await this.createTopic(topic);
    } catch (err) {
      this.customLogger.error(`could not create the default topic ${topic}: ${err.message}`, {err, topic});
    }
  }

  /**
   * Create (or instantiate) a subscription `subscription`.
   *
   * @param topic Name of the subscription to be created (or just instantiated, if existing).
   *
   * @param subscription
   * @return Resolves with an instance of `Subscription`, or undefined. Any error will be logged but not rejected.
   */
  private async useDefaultSubscription(topic: string, subscription: string) {
    try {
      return await this.createSubscription(topic, subscription);
    } catch (err) {
      this.customLogger.error(`could not create the default subscription ${subscription}: ${err.message}`, {err, subscription});
      return undefined;
    }
  }

  /**
   * Responsible for handling any incoming message: parsing (and
   * structural checking). `message` is expected to be a stringified
   * POJO containing a string prop. `pattern` and an optional object
   * prop. `data`.
   *
   * @see {CloudPubSubMessageData}
   *
   * @param message Message received from a Subscription.
   * @param subscriptionName Name of the subscription receiving the message.
   *
   * @return Resolve with the Observable sent by the handler of the message pattern.
   */
  private async handleMessage(message: PubSubMessageInterface, subscriptionName: string) {
    const rawData = message.data.toString();
    const messageData = this.parsePublisherData(rawData);
    const {ackAfterHandler} = this.options;

    if (ackAfterHandler !== true) {
      message.ack();
    }

    if (!messageData) {
      this.customLogger.error(`invalid message received (${subscriptionName})`, {rawData, subscriptionName});
      return;
    }

    const {pattern, data = {}} = messageData;
    const handler = this.getHandlerByPattern(pattern);

    if (!handler) {
      this.customLogger.error(`no handler exists for "${pattern}"`, {messageData, subscriptionName});
      return;
    }

    if (ackAfterHandler !== true) {
      return handler(data);
    }

    // ackAfterHandler has been enabled: execute the handler, then, eventually ACK the message
    try {
      const observableResult = await handler(data);
      message.ack();
      return observableResult;
    } catch (error) {
      this.customLogger.error(`error from the handler of "${pattern}"`, {error, messageData, subscriptionName});
      message.nack();
    }
  }

  /**
   * Parse the stringified data of a message sent by a publisher and
   * ensure this last has a valid structure (it must be an object with
   * a string property `pattern`).
   *
   * @param value So-called "stringified" `data`.
   *
   * @return representation of the given `value`, or `undefined`.
   *
   * @see {PubSubMessageInterface}
   */
  private parsePublisherData(value: string): CloudPubSubMessageData | undefined {
    if (!value) {
      return undefined;
    }

    try {
      const data = JSON.parse(value);

      if (data.pattern && typeof data.pattern === 'string') {
        return data;
      }
    } catch {
      /* JSON parsing failed: invalid message */
    }

    return undefined;
  }
}
