
export const PERMISSIONS = {
    ORG_MANAGE_MEMBERS: 'org:manage_members',
    ORG_MANAGE_ROLES: 'org:manage_roles',
    ORG_MANAGE_DELETE: 'org:delete',
    ORG_MANAGE_BILLING: 'org:manage_billing',
    ORG_UPDATE_SETTINGS: 'org:update_settings',

} as const;

const PLATFORM_SHARE_BPS = 2000;

function split(amountCents: number) {
    const platform = Math.round(amountCents * PLATFORM_SHARE_BPS / 10000);
    const pool = amountCents - platform;
    return { platform, pool };
}