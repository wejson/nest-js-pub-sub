import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import {AppController} from './controllers/app.controller';
import {AppService} from './app.service';
import {ServicesModule} from './services/servcies.module';
import {ConfigModule} from '@nestjs/config';
import {RequestLoggerMiddleware} from './middlewares';
import {PUB_SUB_CLIENT_PROVIDER} from './transports/pub-sub-client-provider';

@Module({
  imports: [ConfigModule.forRoot(), ServicesModule],
  controllers: [AppController],
  providers: [AppService, PUB_SUB_CLIENT_PROVIDER],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes({path: '*', method: RequestMethod.ALL});
  }
}
