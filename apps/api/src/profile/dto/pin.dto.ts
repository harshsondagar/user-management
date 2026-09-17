import { IsString, Matches } from 'class-validator';

const FOUR_DIGIT_PIN = /^\d{4}$/;

export class SetPinDto {
    @IsString()
    @Matches(FOUR_DIGIT_PIN, { message: 'pin must be exactly 4 digits' })
    pin!: string;
}

export class VerifyPinDto {
    @IsString()
    @Matches(FOUR_DIGIT_PIN, { message: 'pin must be exactly 4 digits' })
    pin!: string;
}