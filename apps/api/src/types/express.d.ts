import { User as UserEntity } from '@app/shared';


declare global {
    namespace Express {
        interface Request {
            user?: UserEntity
        }
    }
}