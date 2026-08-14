import { testEnv } from "@app/shared";
import { AppModule } from "../../../src/app.module";
import { MailService } from "../../../src/mail/mail.service";
import { mockMailService } from "./mock-mail-utils";
import { Test } from '@nestjs/testing';
import { INestApplication } from "@nestjs/common";
import { disableCronJobs } from "./cron-utils";


interface CreateQueueTestAppOptions {
    mockMail?: boolean;
}

export async function createQueueTestApp(
    options: CreateQueueTestAppOptions = {},
): Promise<INestApplication> {
    const { mockMail = true } = options;
    const workerId = process.env.JEST_WORKER_ID ?? '1';

    process.env.DB_NAME = `test_db_${workerId}`;
    process.env.REDIS_DB = String(workerId);
    process.env.MONGO_URI = `mongodb://localhost:27018/test_mongo_${workerId}`;

    const builder = Test.createTestingModule({ imports: [AppModule] });

    if (mockMail) {
        builder.overrideProvider(MailService).useValue(mockMailService);
    }

    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication();
    app.useLogger(['fatal'])
    await app.init();
    disableCronJobs(app);
    return app;
}