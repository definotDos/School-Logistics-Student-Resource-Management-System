const request = require('supertest');

const originalEnv = { ...process.env };
let app;
beforeEach(() => {
  jest.resetModules();
  process.env.NODE_ENV = 'production';
  process.env.TRUST_PROXY_HOPS = '1';
  process.env.FRONTEND_ORIGIN = 'https://school.example.com/';
  app = require('../src/app');
});
afterEach(() => { process.env = { ...originalEnv }; });

test('HTTPS forwarded by the host is accepted and the origin is normalized', async () => {
  const response = await request(app).get('/').set('X-Forwarded-Proto', 'https');
  expect(response.status).toBe(200);
  expect(response.headers['access-control-allow-origin']).toBe('https://school.example.com');
});

test('plain HTTP is still rejected in production', async () => {
  expect((await request(app).get('/')).status).toBe(400);
});

test('explicitly allowed cross-site frontend passes the origin guard', async () => {
  const response = await request(app).post('/api/nonexistent')
    .set('X-Forwarded-Proto', 'https').set('Origin', 'https://school.example.com')
    .set('Sec-Fetch-Site', 'cross-site');
  expect(response.status).toBe(404);
});

test.each(['https://untrusted.example.com', null])('untrusted cross-site mutation is rejected: %s', async origin => {
  let call = request(app).post('/api/nonexistent')
    .set('X-Forwarded-Proto', 'https').set('Sec-Fetch-Site', 'cross-site');
  if (origin) call = call.set('Origin', origin);
  expect((await call).status).toBe(403);
});
