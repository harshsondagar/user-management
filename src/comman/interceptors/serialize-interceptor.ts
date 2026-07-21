import { CallHandler, createParamDecorator, ExecutionContext, Injectable, UseInterceptors } from "@nestjs/common";
import { NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";
import { ClassConstructor, plainToInstance } from "class-transformer"

export function Serialize<T>(dto: ClassConstructor<T>) {
    return UseInterceptors(new SerializeInterceptor(dto))
}

export class SerializeInterceptor<T> implements NestInterceptor {

    constructor(private readonly dto: ClassConstructor<T>) { }

    intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
        return next.handle().pipe(
            map((data) => {
                const result = plainToInstance(this.dto, data, { excludeExtraneousValues: true })
                return result
            })

        )
    }
}