import {ConfigService} from '@nestjs/config';
import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {LoggerService} from './services/logger.service';
import * as morgan from 'morgan';
import {Logger} from 'winston';
import {AppModule} from './app.module';
import {HTTP_LOGGER_MODE, NODE_ENV, PORT} from './constants';
import {openAPI} from './open-api';
import {PubSubServer} from 'nestjs-google-pubsub';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const loggerService: LoggerService = app.get<LoggerService>(LoggerService);
  const log: Logger = loggerService.getLogger('main');
  const conf: ConfigService = app.get<ConfigService>(ConfigService);
  // enable CORS
  app.enableCors();
  // swagger
  if (conf.get(NODE_ENV) !== 'production') {
    openAPI(app);
  }
  process.on('unhandledRejection', (err: Error) => {
    log.error(`unhandledRejection ${err}`, loggerService.errToLog(err));
  });

  // http logger
  app.use(
    conf.get(HTTP_LOGGER_MODE) === 'developer' ?
      morgan('combined') :
      morgan('tiny', {
        skip: (req, res) => {
          return res.statusCode < 400;
        },
      }));

  const port: number = conf.get<number>(PORT);
  await app.listen(port, () => {
    log.debug(`app listening on port : ${port}`, { port });
  });
}

bootstrap().catch(e => console.error(e));
