import { User as UserEntity } from "../user/entity/user-entity";
import { Room as RoomEntity } from "@app/shared";

declare global {
    namespace Express {
        interface User extends UserEntity { }

        interface Room extends RoomEntity { }

        interface Request {
            user?: User
            room?: Room;
        }
    }
}

export { };