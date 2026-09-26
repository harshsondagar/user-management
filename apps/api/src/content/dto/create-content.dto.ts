import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { ContentAccessType, ContentType } from "../entity/conetnt-entity";
import { PartialType } from "@nestjs/swagger";

export class CreateContentDto {
    @IsString() @IsNotEmpty()
    title!: string;

    @IsEnum(ContentType) // MOVIE | SERIES — confirm exact enum name/values
    type!: ContentType;

    @IsInt() @Min(1) @Max(5)
    maturityLevel!: number;

    @IsEnum(ContentAccessType)
    accessType!: ContentAccessType;

    @IsOptional() @IsString()
    description?: string;

}


export class UpdateContentDto extends PartialType(CreateContentDto) {

}