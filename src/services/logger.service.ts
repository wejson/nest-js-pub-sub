import { Injectable } from '@nestjs/common';
import { v1 as uuidv1 } from 'uuid';
import { createLogger, format, transports } from 'winston';
import { LOGGER_LEVEL, LOGGER_MODE } from '../constants';

const { combine, timestamp, label, json, prettyPrint, colorize, printf, padLevels } = format;
const { Console, File } = transports;

@Injectable()
export class LoggerService {

  private readonly logLevel: string;
  private readonly mode: string;

  constructor() {
    this.logLevel = process.env[LOGGER_LEVEL] || 'debug';
    this.mode = process.env[LOGGER_MODE] || 'json';
  }

  public errToLog(err: Error) {
    return { error: `${err}`, stack: err?.stack };
  }

  public getLogger(...keys) {
    return createLogger({
      level: this.logLevel,
      transports: this.buildTransports(),
      format: this.buildFormat([ ...keys, uuidv1() ].join(':')),
    });
  }

  private buildTransports(path: string = process.env.LOGGER_PATH) {
    const arr = [];
    // add default transport (STDOUT)
    arr.push(new Console());
    // add log to file
    if (path) {
      arr.push(new File({ filename: path }));
    }
    return arr;
  }

  private buildFormat(namespace: string) {
    switch (this.mode) {
      case 'developer':
        const developerFormat = printf(({ level, message, label: devLabel, timestamp: devTimestamp, action, ...rest }) => {
          const a = action ? `:${action}` : '';
          const r = Object.keys(rest).length ? JSON.stringify(rest) : '';
          return `${devTimestamp} ${level}: [${devLabel}${a}] ${message} ${r}`;
        });
        return combine(colorize({ all: true }), padLevels(), label({ label: namespace }), timestamp(), developerFormat);
      case 'pretty':
        return combine(label({ label: namespace }), timestamp(), prettyPrint());
      case 'json':
      default:
        return combine(label({ label: namespace }), timestamp(), json());
    }
  }
}
