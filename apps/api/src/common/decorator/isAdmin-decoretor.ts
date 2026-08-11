import { SetMetadata } from "@nestjs/common"

export const IS_SUPER_ADMIN = "isSuperAdmin"
export const SuperAdmin = SetMetadata(IS_SUPER_ADMIN, true)