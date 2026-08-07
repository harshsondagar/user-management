import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    DeepPartial,
    FindManyOptions,
    FindOneOptions,
    FindOptionsWhere,
    ObjectLiteral,
    Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/browser';
import { Followers } from '@app/shared';

export interface BaseInterfaceRepository<T> {
    create(data: DeepPartial<T>): Promise<T>;
    createMany(data: DeepPartial<T>[]): Promise<T[]>
    save(data: DeepPartial<T>): Promise<T>
    saveMany(data: DeepPartial<T>[]): Promise<T[]>
    findOneById(id: string): Promise<T>
    findByCondition(filterCondition: FindOneOptions<T>): Promise<T>;
    findAll(options?: FindManyOptions<T>): Promise<T[]>
    remove(data: T): Promise<T>
    findWithRelations(relations: FindManyOptions<T>): Promise<T[]>
    preload(entityLike: DeepPartial<T>): Promise<T>
    findOne(options: FindOneOptions<T>): Promise<T | null>
    updateBy(where: FindOptionsWhere<T>, data: DeepPartial<T>): Promise<void>
    save(entity: T): Promise<T>;
    remove(entity: T): Promise<T>;
    deleteBy(where: FindOptionsWhere<T> | FindOptionsWhere<T>[]): Promise<void>;
    delete(id: string): Promise<void>;
}


export abstract class BaseRepository<T extends ObjectLiteral> implements BaseInterfaceRepository<T> {

    constructor(@InjectRepository(Followers) protected readonly repository: Repository<T>) {

    }

    async create(data: DeepPartial<T>): Promise<T> {
        const entity = this.repository.create(data);
        return this.repository.save(entity);
    }

    async findAll(options?: FindManyOptions<T>): Promise<T[]> {
        return this.repository.find(options);
    }

    async findOne(options: FindOneOptions<T>): Promise<T | null> {
        return this.repository.findOne(options);
    }

    async update(id: string, data: DeepPartial<T>): Promise<T | null> {
        await this.repository.update(id, data as QueryDeepPartialEntity<T>);

        return this.repository.findOne({
            where: { id } as any,
        });
    }

    async updateBy(
        where: FindOptionsWhere<T>,
        data: DeepPartial<T>,
    ): Promise<void> {
        await this.repository.update(where, data as QueryDeepPartialEntity<T>);
    }

    async delete(id: string): Promise<void> {
        await this.repository.delete(id);
    }

    async exists(options: FindOneOptions<T>): Promise<boolean> {
        const entity = await this.repository.findOne(options);

        return !!entity;
    }

    async count(options?: FindManyOptions<T>): Promise<number> {
        return this.repository.count(options);
    }

    async findOneBy(
        where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    ): Promise<T | null> {
        return this.repository.findOneBy(where);
    }

    async createMany(data: DeepPartial<T>[]): Promise<T[]> {
        const entities = this.repository.create(data);
        return this.repository.save(entities);
    }

    async save(data: DeepPartial<T>): Promise<T> {
        const entity = this.repository.create(data);
        return this.repository.save(entity);
    }

    async saveMany(data: DeepPartial<T>[]): Promise<T[]> {
        const entities = this.repository.create(data);
        return this.repository.save(entities);
    }

    async findOneById(id: string): Promise<T> {
        const entity = await this.repository.findOne({
            where: { id } as unknown as FindOptionsWhere<T>,
        });

        if (!entity) {
            throw new NotFoundException(`Entity with id ${id} not found`);
        }

        return entity;
    }

    async findByCondition(filterCondition: FindOneOptions<T>): Promise<T> {
        const entity = await this.repository.findOne(filterCondition);

        if (!entity) {
            throw new NotFoundException(`Entity not found`);
        }

        return entity;
    }

    async findWithRelations(relations: FindManyOptions<T>): Promise<T[]> {
        return this.repository.find(relations);
    }
    // async save(entity: T): Promise<T> {
    //     return this.repository.save(entity);
    // }

    async remove(data: T): Promise<T> {
        return this.repository.remove(data);
    }

    async preload(entityLike: DeepPartial<T>): Promise<T> {
        const entity = await this.repository.preload(entityLike);

        if (!entity) {
            throw new NotFoundException(`Entity to preload not found`);
        }

        return entity;
    }

    async deleteBy(
        where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    ): Promise<void> {
        if (
            !where ||
            (Array.isArray(where) && where.length === 0) ||
            (!Array.isArray(where) && Object.keys(where).length === 0)
        ) {
            throw new Error('deleteBy: "where" must be a non-empty condition or array of conditions');
        }
        await this.repository.delete(where as any);
    }
}