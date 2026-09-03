import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../../user/entity/user-entity';
import { Plan } from '../entities/plan-entity';
import { UserSubscription, SubscriptionStatus } from '../entities/user-subscription-entity';
import * as bcrypt from 'bcrypt';
import path, { join, resolve } from 'path';


dotenv.config({ path: resolve(join(process.cwd(), 'apps/api/.env')) });

const TOTAL_USERS = 200; // adjust for however much pagination data you want

const FIRST_NAMES = ['Aditi', 'Rohan', 'Priya', 'Karan', 'Sneha', 'Vikram', 'Meera', 'Arjun', 'Divya', 'Rahul'];
const LAST_NAMES = ['Sharma', 'Verma', 'Iyer', 'Reddy', 'Kapoor', 'Nair', 'Gupta', 'Joshi', 'Menon', 'Rao'];
const STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE, SubscriptionStatus.CANCELED, SubscriptionStatus.INCOMPLETE];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgoMin: number, daysAgoMax: number): Date {
    const daysAgo = Math.floor(Math.random() * (daysAgoMax - daysAgoMin)) + daysAgoMin;
    return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

async function main() {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [path.join(__dirname, '../../**/*-entity.ts')],
        migrations: [path.join(__dirname, '../../migration/*.{ts,js}')],
    });

    await dataSource.initialize();
    console.log('Connected. Seeding fake data...');

    const plans = await dataSource.getRepository(Plan).find();
    if (plans.length === 0) {
        throw new Error('No plans found — seed plans first (BillingSeedService or your plan seed script).');
    }

    const passwordHash = await bcrypt.hash('Password123!', 10); // same hash reused — fine for fake/test data

    const userRepo = dataSource.getRepository(User);
    const subRepo = dataSource.getRepository(UserSubscription);

    for (let i = 0; i < TOTAL_USERS; i++) {
        const firstName = pick(FIRST_NAMES);
        const lastName = pick(LAST_NAMES);
        const email = `fake.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`;

        const user = await userRepo.save(
            userRepo.create({
                firstName,
                lastName,
                email,
                passwordHash,
                isEmailVerified: true,
            }),
        );

        const plan = pick(plans);
        const status = pick(STATUSES);
        const isActive = status === SubscriptionStatus.ACTIVE;

        await subRepo.save(
            subRepo.create({
                userId: user.id,
                planId: plan.id,
                status,
                stripeSubscriptionId: null,
                currentPeriodEnd: isActive ? randomDate(-30, 30) : randomDate(1, 90), // active: mix of past/future; others: in the past
                canceledAt: status === SubscriptionStatus.CANCELED ? randomDate(1, 60) : null,
                createdAt: randomDate(1, 180),
            }),
        );

        if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${TOTAL_USERS} done`);
    }

    console.log(`Seeded ${TOTAL_USERS} fake users with subscriptions.`);
    await dataSource.destroy();
}

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});