import { Test, TestingModule } from '@nestjs/testing';
import { DatagovScraperService } from './datagov-scraper.service';

describe('DatagovScraperService', () => {
  let service: DatagovScraperService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatagovScraperService],
    }).compile();

    service = module.get<DatagovScraperService>(DatagovScraperService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
