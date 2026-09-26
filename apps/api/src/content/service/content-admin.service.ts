import { Injectable, NotFoundException } from "@nestjs/common";
import { Content, ContentStatus } from "../entity/conetnt-entity";
import { InjectRepository } from "@nestjs/typeorm";
import { BaseRepository } from "../../common/repository/base.repository";
import { CreateContentDto, UpdateContentDto } from "../dto/create-content.dto";
import { ContentRepository } from "../repository/content-repository";
import { randomUUID } from "crypto";

@Injectable()
export class ContentAdminService {
    constructor(
        private readonly contentRepo: ContentRepository,
    ) {
    }

    async create(organizationId: string, dto: CreateContentDto): Promise<Content> {
        return this.contentRepo.create({
            id: randomUUID(),
            ...dto,
            organizationId,
            status: ContentStatus.DRAFT,
        });
    }


    private async findOwnedOrThrow(organizationId: string, contentId: string): Promise<Content> {
        const content = await this.contentRepo.findOne({ where: { id: contentId, organizationId } });
        if (!content) throw new NotFoundException();
        return content;
    }

    async update(organizationId: string, contentId: string, dto: UpdateContentDto): Promise<Content> {
        const content = await this.findOwnedOrThrow(organizationId, contentId);
        Object.assign(content, dto);
        return this.contentRepo.save(content);
    }

    async setStatus(organizationId: string, contentId: string, status: ContentStatus): Promise<Content> {
        const content = await this.findOwnedOrThrow(organizationId, contentId);
        content.status = status;
        return this.contentRepo.save(content);
    }
}