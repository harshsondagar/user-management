import { Test, TestingModule } from '@nestjs/testing';
import { DlqService } from './dlq.service';

describe('DlqService', () => {
  let service: DlqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DlqService],
    }).compile();

    service = module.get<DlqService>(DlqService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
