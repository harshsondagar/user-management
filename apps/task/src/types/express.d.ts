import { User as UserEntity } from '../user/user-entity';


declare global {
    namespace Express {
        interface Request {
            user?: UserEntity
        }
    }
}