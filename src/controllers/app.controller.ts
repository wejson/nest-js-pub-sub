import {Body, Controller, Get, OnModuleInit, Post} from '@nestjs/common';
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

@ApiTags('Example controller')
@ApiBearerAuth() // this is to enable to add token to the request
@Controller()
export class AppController implements OnModuleInit {
  private readonly logger: Logger;
  private readonly apiEndpoint: string;
  private readonly projectId: string;
  private pubsubClient: PubSub;

  constructor(private readonly appService: AppService,
              private readonly conf: ConfigService,
              private readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getLogger(this.constructor.name);
    this.apiEndpoint = conf.get('PUB_SUB_ENDPOINT') || 'pubsub-service:8432';
    this.projectId = conf.get('PUB_SUB_PROJECT_ID') || 'example-project-id';
  }

  async onModuleInit() {
    const log = this.logger.child({method: 'onModuleInit'});
    try {
      this.pubsubClient = new PubSub({
        projectId: 'example-project-id', apiEndpoint: 'pubsub-service:8432',
      });
      log.debug('created pub sub client');
    } catch (e) {
      log.error(`error connecting to pub sub ${e}`, {error: e});
    }
  }

  @EventPattern('test-example-topic')
  async handleMyTopicEvent(data: Message) {
    this.logger.info('received pub sub msg', {data});
    data.ack();
  }

  @Get()
  @ApiResponse({type: HelloworldResponse, status: 200, description: 'returning hello for each request'})
  async getHello(@ContextId() contextId: string): Promise<HelloworldResponse> {
    const log = this.logger.child({contextId});
    log.info('requested to say hello');
    return {message: this.appService.getHello()};
  }

  @Post()
  @ApiResponse({type: ExampleApiResponse, status: 201, description: 'sum a number array'})
  async exampleApi(@ContextId() contextId: string, @Body() {data}: ExampleApiRequest): Promise<ExampleApiResponse> {
    const log = this.logger.child({contextId});
    log.info('summing numbers', {numbers: data});
    return {sum: this.appService.accumulate(data)};
  }
}
