import { INestApplication, ValidationPipe } from "@nestjs/common";
import { AppModule } from "../../../src/app.module";
import { Test } from "@nestjs/testing";
import { MailService } from "../../../src/mail/mail.service";
import { mockMailService } from "./mock-mail.util";
import { DataSource } from "typeorm";


export async function createTestApp(): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(MailService)
        .useValue(mockMailService)
        .compile()


    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    return app;
}

export function bindRepositoriesToTransaction(dataSource: DataSource, queryRunner: import('typeorm').QueryRunner) {

    (dataSource as any).manager = queryRunner.manager;
}