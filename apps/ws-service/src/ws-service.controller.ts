import { Controller, Get } from '@nestjs/common';
import { WsServiceService } from './ws-service.service';

@Controller()
export class WsServiceController {
  constructor(private readonly wsServiceService: WsServiceService) {}

  @Get()
  getHello(): string {
    return this.wsServiceService.getHello();
  }
}
