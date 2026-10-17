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

test('login has exactly the /api prefix and missing routes return JSON', async () => {
  const valid = await request(app).post('/api/auth/login').set('X-Forwarded-Proto', 'https').send({});
  expect(valid.status).toBe(401);
  expect(valid.body.message).toBe('Invalid email or password.');
  for (const path of ['/auth/login', '/api/api/auth/login']) {
    const missing = await request(app).post(path).set('X-Forwarded-Proto', 'https').send({});
    expect(missing.status).toBe(404);
    expect(missing.type).toBe('application/json');
    expect(missing.body.message).toContain('/api');
  }
});

test.each(['signup', 'verify-email', 'resend-verification-code', 'forgot-password', 'reset-password', 'activate-account', 'mfa/verify', 'mfa/resend'])('auth endpoint %s reaches input validation without a database or email', async path => {
  const response = await request(app).post(`/api/auth/${path}`).set('X-Forwarded-Proto', 'https').send({});
  expect(response.status).toBe(400);
  expect(response.type).toBe('application/json');
  expect(response.body.message).toEqual(expect.any(String));
});

test('CORS preflight permits the deployed origin and authorization header', async () => {
  const response = await request(app).options('/api/auth/login')
    .set('Origin', 'https://school.example.com').set('Access-Control-Request-Method', 'POST')
    .set('Access-Control-Request-Headers', 'content-type,authorization');
  expect(response.status).toBe(204);
  expect(response.headers['access-control-allow-origin']).toBe('https://school.example.com');
  expect(response.headers['access-control-allow-credentials']).toBe('true');
  expect(response.headers['access-control-allow-headers']).toContain('authorization');
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
