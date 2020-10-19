import {Body, Controller, Get, Inject, OnModuleInit, Post} from '@nestjs/common';
import {AppService} from '../app.service';
import {LoggerService} from '../services/logger.service';
import {Logger} from 'winston';
import {ApiBearerAuth, ApiResponse, ApiTags} from '@nestjs/swagger';
import {ExampleApiRequest, ExampleApiResponse, HelloworldResponse} from './app.dto';
import {ContextId} from '../decorators/context-id.decorator';
import {Message, PubSub} from '@google-cloud/pubsub';
import {GoogleAuth} from 'google-auth-library';
import {EventPattern} from '@nestjs/microservices';
import {ConfigService} from '@nestjs/config';
import {PUB_SUB_TOPIC} from '../constants';
import {PUB_SUB_CLIENT_TOKEN} from '../transports/pub-sub-client-provider';
import {PubSubClient} from '../transports/pub-sub-client';

@ApiTags('Example controller')
@ApiBearerAuth() // this is to enable to add token to the request
@Controller()
export class AppController implements OnModuleInit {
  private readonly logger: Logger;
  private pubsubClient: PubSub;
  private readonly apiEndpoint: string;
  private readonly projectId: string;
  private readonly topic: string;

  constructor(private readonly appService: AppService,
              private readonly conf: ConfigService,
              @Inject(PUB_SUB_CLIENT_TOKEN) private client: PubSubClient,
              private readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getLogger(this.constructor.name);
    this.apiEndpoint = conf.get('PUB_SUB_ENDPOINT') || 'pubsub-service:8432';
    this.projectId = conf.get('PUB_SUB_PROJECT_ID') || 'example-project-id';
    this.topic = conf.get(PUB_SUB_TOPIC) || 'test-example-topic';
  }

  async onModuleInit() {
    const log = this.logger.child({method: 'onModuleInit'});
    try {
      await this.client.connect();
      this.pubsubClient = new PubSub({
        projectId: this.projectId, apiEndpoint: this.apiEndpoint,
      });
      log.debug('created pub sub client');
    } catch (e) {
      log.error(`error connecting to pub sub ${e}`, {error: e});
    }
  }

  @EventPattern('test-example-topic')
  async handleMyTopicEvent(data: Message) {
    this.logger.info('received pub sub msg', {data});
  }

  @Get()
  @ApiResponse({type: HelloworldResponse, status: 200, description: 'returning hello for each request'})
  async getHello(@ContextId() contextId: string): Promise<HelloworldResponse> {
    const log = this.logger.child({contextId});
    log.info('requested to say hello');
    return {message: this.appService.getHello()};
  }

  @Post()
  @ApiResponse({type: ExampleApiResponse, status: 201, description: 'publish a msg to topic'})
  async exampleApi(@ContextId() contextId: string, @Body() {data, topic}: ExampleApiRequest): Promise<ExampleApiResponse> {
    const log = this.logger.child({contextId});
    log.info('summing numbers', {numbers: data});
    const msgId = await this.client.emit(topic, data).toPromise();
    // const msgId = await this.pubsubClient.topic(topic).publish(Buffer.from(JSON.stringify({data, pattern: 'test-example-topic'})));
    // const messageId = await pubSubClient.topic(topicName).publish(dataBuffer);
    return {sum: this.appService.accumulate(data), msgId};
  }
}
