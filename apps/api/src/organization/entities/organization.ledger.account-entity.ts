import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";


@Entity('org_ledger_accounts')
export class OrgLedgerAccount {
    @PrimaryColumn({ type: 'uuid' })
    organizationId!: string;

    @Column({ type: 'varchar', unique: true })
    earningsAccountId!: string;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

}
