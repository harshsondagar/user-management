import { Test, TestingModule } from '@nestjs/testing';
import { DatagovScraperController } from './datagov-scraper.controller';

describe('DatagovScraperController', () => {
  let controller: DatagovScraperController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatagovScraperController],
    }).compile();

    controller = module.get<DatagovScraperController>(DatagovScraperController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
