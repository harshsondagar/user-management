// dto/move.dto.ts
import { IsEnum } from 'class-validator';

export enum Direction {
    UP = 'up',
    DOWN = 'down',
    LEFT = 'left',
    RIGHT = 'right',
}

export class MoveDto {
    @IsEnum(Direction)
    direction!: Direction;
}