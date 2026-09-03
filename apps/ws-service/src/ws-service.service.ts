import { Injectable } from '@nestjs/common';

@Injectable()
export class WsServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
