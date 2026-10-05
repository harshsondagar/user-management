import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../auth/gurads/jwt.guard';
import { SuperAdminGuard } from '../../common/gaurds/superAdmin-gaurds';
import { SettlementService } from '../service/settlement.service';
import { IsString } from 'class-validator';

class RunSettlementDto {
    @IsString()
    month!: string;
}

@Controller('admin/settlement')
@UseGuards(JwtGuard, SuperAdminGuard)
export class AdminSettlementController {
    constructor(private readonly settlementService: SettlementService) { }

    @Post('run')
    async run(@Body() dto: RunSettlementDto) {
        const monthStart = new Date(`${dto.month}T00:00:00Z`);
        if (isNaN(monthStart.getTime()) || monthStart.getUTCDate() !== 1) {
            throw new BadRequestException('month must be the first day of a month, e.g. "2026-09-01"');
        }
        return this.settlementService.settleMonth(monthStart);
    }
}