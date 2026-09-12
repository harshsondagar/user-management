import { IsInt, IsOptional, Max, Min } from "class-validator";

export class CreateInviteLinkDto {
    // null/omitted = unlimited uses
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1000)
    maxUses?: number

    // null/omitted = never expires. Capped at 30 days here as a sane default
    // ceiling - raise it if you actually want longer-lived links.
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(60 * 24 * 30)
    expiresInMinutes?: number
} 