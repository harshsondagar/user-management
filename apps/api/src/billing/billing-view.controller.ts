// billing-view.controller.ts
import { Controller, Get, Query, Req } from '@nestjs/common';
import { Render } from '@nestjs/common';
import { Public } from '../common/decorator/public-decoretor';
import { UseGuards } from '@nestjs/common';
import { currentUser } from '../common/decorator/currentUser-decorator';
import { User } from '../user/entity/user-entity';

@Controller('billing')
export class BillingViewController {
    @Public()
    @Get('plans')
    @Render('view-plan')
    getPlansPage(
        @currentUser() user: User | null,
    ) {
        return {
            billing: 'monthly',
            currentPlan: null, // adjust to whatever field actually stores the plan on your User entity
        };
    }
}