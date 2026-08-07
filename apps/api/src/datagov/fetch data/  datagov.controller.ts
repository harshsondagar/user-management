import { Controller, Get, Param, Query } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Dataset } from "@app/shared";
import { Model } from "mongoose";
import { UserRole } from "@app/shared";
import { currentUser } from "../../common/decorator/currentUser-decorator";


@Controller('data-gov')
export class DatagovScraperController {
    constructor(
        @InjectModel(Dataset.name) private readonly datasetModel: Model<Dataset>
    ) { }




    @Get(':topic')
    async byTopic(@Param('topic') topic: string, @Query('page') page: string, @Query('pageSize') pageSize: string, @currentUser() user: any) {
        const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
        const maxPageSize = isAdmin ? 100 : 20;

        const currentPage = Math.max(Number(page) || 1, 1);
        const effectivePageSize = Math.min(Number(pageSize) || maxPageSize, maxPageSize);
        const skip = (currentPage - 1) * effectivePageSize;

        const matchStage = { $text: { $search: topic } };

        const [results, totalCountResult] = await Promise.all([
            this.datasetModel.aggregate([
                { $match: matchStage },
                { $addFields: { score: { $meta: 'textScore' } } },
                { $sort: { score: -1 } },
                { $unwind: '$records' },
                { $skip: skip },
                { $limit: effectivePageSize },
                {
                    $project: {
                        _id: 0,
                        resourceId: 1,
                        title: 1,
                        ministry: 1,
                        sector: 1,
                        record: '$records',
                    },
                },
            ]),
            this.datasetModel.aggregate([
                { $match: matchStage },
                { $unwind: '$records' },
                { $count: 'total' },
            ]),
        ]);

        const total = totalCountResult[0]?.total ?? 0;

        if (total === 0) {
            return {
                topic,
                total: 0,
                page: currentPage,
                pageSize: effectivePageSize,
                totalPages: 0,
                records: [],
                message: `No data found for "${topic}" yet. An admin can run a sync via /sync/run?q=${encodeURIComponent(topic)}.`,
            };
        }

        return {
            topic,
            total,
            page: currentPage,
            pageSize: effectivePageSize,
            totalPages: Math.ceil(total / effectivePageSize),
            hasNextPage: skip + results.length < total,
            records: results,
        };
    }


}