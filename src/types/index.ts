export interface registerBody {
    firstName?: string,
    lastName?: string
    email: string
    passwordHash: string,
}
export interface JwtRefreshPayload {
    sub: string;
    jwt: string
}export interface JwtAccessPayload {
    sub: string;
    email: string;
    role: string;
    tokenVersion: number;
}
