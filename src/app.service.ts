import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  accumulate(data: number[]): number {
    return (data || []).reduce((a, b) => Number(a) + Number(b), 0);
  }
}
