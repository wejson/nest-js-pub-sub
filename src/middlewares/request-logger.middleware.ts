import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import * as uuid from 'uuid/v1';
import { LoggerService } from '../services/logger.service';
import { Logger } from 'winston';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger: Logger;

  constructor(private readonly loggerService: LoggerService) {
    this.logger = this.loggerService.getLogger(this.constructor.name);
  }

  use(req: Request, res: Response, next: () => void) {
    const { originalUrl, body, query } = req;
    req.contextId = uuid();
    if (originalUrl !== '/health') {
      this.logger.verbose(originalUrl, { body, query });
    }
    return next();
  }
}
