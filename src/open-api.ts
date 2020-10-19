import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const openAPI = (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('My service')
    .setDescription('Microservice desc')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('explorer', app, document);
};
