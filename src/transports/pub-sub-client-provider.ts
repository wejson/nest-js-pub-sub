import {ConfigService} from '@nestjs/config';
import {ClientConfig} from '@google-cloud/pubsub/build/src/pubsub';
import {LoggerService} from '../services/logger.service';
import {PUB_SUB_ENDPOINT, PUB_SUB_PROJECT_ID, PUB_SUB_TOPIC} from '../constants';
import {PubSubClient} from './pub-sub-client';

export const PUB_SUB_CLIENT_TOKEN = 'PUB_SUB_CLIENT_PROVIDER';
export const PUB_SUB_CLIENT_PROVIDER = {
  provide: PUB_SUB_CLIENT_TOKEN,
  useFactory: (conf: ConfigService, log: LoggerService) => {
    const config: ClientConfig = {
      apiEndpoint: conf.get(PUB_SUB_ENDPOINT),
      projectId: conf.get(PUB_SUB_PROJECT_ID),
    };
    const topic = conf.get(PUB_SUB_TOPIC);
    return new PubSubClient(config, topic, log);
  },
  inject: [ConfigService, LoggerService],
};
