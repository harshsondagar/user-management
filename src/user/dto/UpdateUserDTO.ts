import { Injectable } from "@nestjs/common";
import { OmitType, PartialType } from "@nestjs/swagger";
import { User } from "../user-entity";


@Injectable()

export class UpdateUserDTO extends PartialType(OmitType(User, ['passwordHash', 'failedLoginAttempts', 'id', 'isAdmin', 'lockedUntil', 'tasks'])) {

}
