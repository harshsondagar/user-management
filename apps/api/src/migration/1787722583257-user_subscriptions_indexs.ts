import { MigrationInterface, QueryRunner } from "typeorm";

export class UserSubscriptionsIndexs1787722583257 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE INDEX "idx_user_subscriptions_userid_status" ON user_subscriptions ("userId",status)')
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('DROP INDEX IF EXISTS "PUBLIC"."idx_user_subscription_userid_status"')
    }

}
