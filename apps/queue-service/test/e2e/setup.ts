import nock from 'nock';

beforeAll(() => {
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
});

afterEach(() => nock.cleanAll());

afterAll(() => nock.enableNetConnect());