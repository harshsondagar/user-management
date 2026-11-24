// apps/pdf/src/receipt/dto/generate-receipt.dto.ts
import { IsEmail, IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class GenerateReceiptDto {
    @IsUUID() paymentId!: string;
    @IsString() date!: string;
    @IsString() customerName!: string;
    @IsEmail() customerEmail!: string;
    @IsString() planName!: string;
    @IsString() periodStart!: string;
    @IsString() periodEnd!: string;
    @IsString() currency!: string;
    @IsNumber() amount!: number;
    @IsNumber() tax!: number;
    @IsNumber() total!: number;
    @IsString() paymentMethod!: string;
    @IsString() transactionId!: string;
}