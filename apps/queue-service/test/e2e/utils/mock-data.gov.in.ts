import nock from 'nock';

// Deliberately NOT module-level consts — process.env isn't guaranteed to be
// fully populated by ConfigModule until AppModule has been imported/booted,
// which can happen *after* this file is first imported in a spec's import
// chain. Reading these inside each function instead of at module scope means
// they're always read at call-time (inside `it()` blocks, safely after boot).
function resourceApiUrl() {
    return process.env.DATA_GOV_IN_RESOURCE_API_URL!;
}
function portalBackendUrl() {
    return process.env.DATA_GOV_IN_PORTAL_BACKEND_URL!;
}
function apiKey() {
    return process.env.DATA_GOV_IN_API_KEY!;
}

export function mockSearchSuccess<T extends Object>(payload: T) {
    return nock(portalBackendUrl())
        .get('/search')
        .query((actual) =>
            actual['filters[type]'] === 'resources' &&
            actual['filters[domain_visibility]'] === '4',
        )
        .reply(200, payload);
}

export function mockSearchFailure(status = 500, times = 1) {
    return nock(portalBackendUrl())
        .get('/search')
        .query(true)
        .times(times)
        .reply(status);
}

export function mockResourceSuccess<T extends object>(resourceId: string, payload: T) {
    return nock(resourceApiUrl())
        .get(`/resource/${resourceId}`)
        .query((actual) => actual['api-key'] === apiKey() && actual.format === 'json')
        .reply(200, payload);
}

export function mockResourceFailure(resourceId: string, status = 500, times = 1) {
    return nock(resourceApiUrl())
        .get(`/resource/${resourceId}`)
        .query(true)
        .times(times)
        .reply(status);
}