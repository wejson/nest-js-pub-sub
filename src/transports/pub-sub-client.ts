import {ClientProxy, ReadPacket} from '@nestjs/microservices';
import {PubSub} from '@google-cloud/pubsub';
import {LoggerService} from '../services/logger.service';
import {Logger} from 'winston';
import {ClientConfig} from '@google-cloud/pubsub/build/src/pubsub';

export class PubSubClient extends ClientProxy {
  private readonly logger: Logger;
  private pubSub: PubSub;
  private readonly options: any;

  private readonly topic: string;

  constructor(
    config: ClientConfig,
    topic: string,
    private readonly loggerService: LoggerService) {
    super();
    this.logger = this.loggerService.getLogger(this.constructor.name);
    this.topic = topic;
    this.options = config;
  }

  async connect(): Promise<void> {
    const log = this.loggerService.getLogger('connect');
    const isExists: boolean = this.pubSub !== undefined;
    if (isExists) {
      return;
    }
    log.debug('connecting to pub sub', {
      projectId: this.options.projectId, apiEndpoint: this.options.apiEndpoint,
    });

    this.pubSub = new PubSub({
      projectId: this.options.projectId, apiEndpoint: this.options.apiEndpoint,
    });
  }

  async close() {
    this.logger.debug('closing the pubsub connection');
    if (this.pubSub !== undefined) {
      await this.pubSub.close();
    }
    this.pubSub = undefined;
  }

  // tslint:disable-next-line:ban-types
  protected publish(packet: ReadPacket<any>, callback: (packet: import('@nestjs/microservices').WritePacket<any>) => void): Function {
    throw new Error('method not implemented.');
  }

  protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<any> {
    const log = this.loggerService.getLogger('dispatchEvent');
    const {data} = packet;
    const pattern: string = this.normalizePattern(packet.pattern);
    log.debug('received msg', {pattern, data});
    if (!this.pubSub || !this.topic) {
      log.warn('no pub sub client/topic');
      return undefined;
    }
    return this.pubSub.topic(this.topic).publishJSON({pattern, data});
  }
}
