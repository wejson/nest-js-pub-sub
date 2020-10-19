import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './app.service';
import { ServicesModule } from './services/servcies.module';
import { ConfigModule } from '@nestjs/config';
import { RequestLoggerMiddleware } from './middlewares';

@Module({
  imports: [ ConfigModule.forRoot(), ServicesModule ],
  controllers: [ AppController ],
  providers: [ AppService ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
