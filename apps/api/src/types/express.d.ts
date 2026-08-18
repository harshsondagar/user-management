import { User as UserEntity } from "../user/entity/user-entity"

declare global {
    namespace Express {
        interface User extends UserEntity { }
    }
}

export { };