import { User as UserEntity } from "../user/entity/user-entity"
declare global {
    namespace Express {
        interface Request {
            user?: UserEntity
        }
    }
}