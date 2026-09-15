import { Test, TestingModule } from '@nestjs/testing';
import { WsServiceController } from './ws-service.controller';
import { WsServiceService } from './ws-service.service';

describe('WsServiceController', () => {
  let wsServiceController: WsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [WsServiceController],
      providers: [WsServiceService],
    }).compile();

    wsServiceController = app.get<WsServiceController>(WsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(wsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
