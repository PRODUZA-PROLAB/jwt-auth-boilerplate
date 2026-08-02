import { before, after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'TEST_ACCESS_SECRET_PLACEHOLDER';
const PWD = 's3nh4Forte';
const BAD_PWD = 'senhaErrada';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-9876543210fedcba';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL = '7d';

const { env } = await import('../src/config/env.js');
const { UserStore } = await import('../src/store/userStore.js');
const { hashPassword, verifyPassword } = await import('../src/utils/password.js');
const { parseDuration } = await import('../src/utils/parseDuration.js');
const validation = await import('../src/utils/validation.js');
const tokenService = await import('../src/services/tokenService.js');
const authService = await import('../src/services/authService.js');
const { createApp } = await import('../src/app.js');

describe('utils de senha (scrypt)', () => {
  test('hashPassword retorna hash com prefixo scrypt, diferente do texto puro', () => {
    const hash = hashPassword('s3nh4Forte');
    assert.notEqual(hash, 's3nh4Forte');
    assert.match(hash, /^scrypt:[a-f0-9]+:[a-f0-9]+$/);
  });

  test('hashPassword gera salts diferentes para a mesma senha', () => {
    assert.notEqual(hashPassword('s3nh4Forte'), hashPassword('s3nh4Forte'));
  });

  test('verifyPassword aceita a senha correta', () => {
    assert.equal(verifyPassword('s3nh4Forte', hashPassword('s3nh4Forte')), true);
  });

  test('verifyPassword rejeita senha incorreta', () => {
    assert.equal(verifyPassword('senhaErrada', hashPassword('s3nh4Forte')), false);
  });

  test('verifyPassword rejeita hash malformado ou ausente', () => {
    assert.equal(verifyPassword('qualquer', 'nao-e-um-hash'), false);
    assert.equal(verifyPassword('qualquer', null), false);
    assert.equal(verifyPassword('qualquer', undefined), false);
  });
});

describe('utils de validação', () => {
  test('isValidEmail aceita e-mails válidos', () => {
    assert.equal(validation.isValidEmail('user@example.com'), true);
    assert.equal(validation.isValidEmail('nome.sobrenome@sub.dominio.org'), true);
  });

  test('isValidEmail rejeita e-mails inválidos', () => {
    assert.equal(validation.isValidEmail('sem-arroba'), false);
    assert.equal(validation.isValidEmail('a@b'), false);
    assert.equal(validation.isValidEmail(''), false);
    assert.equal(validation.isValidEmail(null), false);
  });

  test('isValidPassword exige entre 8 e 128 caracteres', () => {
    assert.equal(validation.isValidPassword('aA1!validPwd'), true);
    assert.equal(validation.isValidPassword('curta'), false);
    assert.equal(validation.isValidPassword('x'.repeat(129)), false);
  });

  test('normalizeEmail normaliza maiúsculas e espaços', () => {
    assert.equal(validation.normalizeEmail('  User@Example.COM  '), 'user@example.com');
  });

  test('assertValidCredentials rejeita credenciais inválidas', () => {
    const pw = ['aA1!', 'validPwd'].join('');
    assert.throws(() => validation.assertValidCredentials({ email: 'invalido', password: pw }), {
      statusCode: 400,
    });
    assert.throws(() => validation.assertValidCredentials({ email: 'user@example.com', password: 'curta' }), {
      statusCode: 400,
    });
  });
});

describe('parseDuration', () => {
  test('converte unidades s/m/h/d para milissegundos', () => {
    assert.equal(parseDuration('30s'), 30_000);
    assert.equal(parseDuration('15m'), 900_000);
    assert.equal(parseDuration('1h'), 3_600_000);
    assert.equal(parseDuration('7d'), 604_800_000);
  });

  test('lança erro para valores inválidos', () => {
    assert.throws(() => parseDuration('10x'));
    assert.throws(() => parseDuration(''));
    assert.throws(() => parseDuration(null));
  });
});

describe('token service', () => {
  const user = { id: 'usr_123', email: 'user@example.com', role: 'user' };

  test('generateAccessToken produz token com claims corretas', () => {
    const token = tokenService.generateAccessToken(user, env);
    const decoded = jwt.decode(token);
    assert.equal(decoded.sub, 'usr_123');
    assert.equal(decoded.email, 'user@example.com');
    assert.equal(decoded.typ, 'access');
    assert.ok(decoded.exp > Math.floor(Date.now() / 1000));
  });

  test('generateRefreshToken emite jti único por chamada', () => {
    const a = tokenService.generateRefreshToken(user, env);
    const b = tokenService.generateRefreshToken(user, env);
    assert.notEqual(a.jti, b.jti);
    assert.equal(jwt.decode(a.token).typ, 'refresh');
    assert.equal(jwt.decode(a.token).jti, a.jti);
  });

  test('verifyAccessToken valida token correto', () => {
    const payload = tokenService.verifyAccessToken(tokenService.generateAccessToken(user, env), env);
    assert.equal(payload.sub, 'usr_123');
  });

  test('verifyAccessToken rejeita token adulterado', () => {
    const token = tokenService.generateAccessToken(user, env);
    const tampered = token.slice(0, -2) + 'xx';
    assert.throws(() => tokenService.verifyAccessToken(tampered, env));
  });

  test('verifyAccessToken rejeita token assinado com segredo errado', () => {
    const token = jwt.sign({ sub: 'usr_123' }, 'outro-segredo', { algorithm: 'HS256' });
    assert.throws(() => tokenService.verifyAccessToken(token, env));
  });

  test('verifyAccessToken rejeita token expirado', () => {
    const token = jwt.sign({ sub: 'usr_123', typ: 'access' }, env.jwt.accessSecret, {
      algorithm: 'HS256',
      expiresIn: '-10s',
    });
    assert.throws(() => tokenService.verifyAccessToken(token, env));
  });
});

describe('auth service', () => {
  const store = new UserStore();

  test('register cria usuário com senha hasheada (sem texto puro no store)', () => {
    const user = authService.register({ email: 'novo@example.com', password: PWD, env, store });
    assert.ok(user.id);
    assert.equal(user.email, 'novo@example.com');
    assert.equal(user.passwordHash, undefined);
    assert.notEqual(store.findByEmail('novo@example.com').passwordHash, 's3nh4Forte');
  });

  test('register rejeita e-mail duplicado', () => {
    assert.throws(
      () => authService.register({ email: 'novo@example.com', password: PWD, env, store }),
      { code: 'EMAIL_IN_USE' }
    );
  });

  test('login retorna accessToken, refreshToken e usuário', () => {
    const result = authService.login({ email: 'novo@example.com', password: PWD, env, store });
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.equal(result.user.email, 'novo@example.com');
  });

  test('login rejeita senha incorreta', () => {
    assert.throws(
      () => authService.login({ email: 'novo@example.com', password: BAD_PWD, env, store }),
      { statusCode: 401 }
    );
  });

  test('refresh rotaciona o token: antigo é revogado', () => {
    const loginResult = authService.login({ email: 'novo@example.com', password: PWD, env, store });
    const rotated = authService.refresh({ refreshToken: loginResult.refreshToken, env, store });
    assert.ok(rotated.accessToken);
    assert.notEqual(rotated.refreshToken, loginResult.refreshToken);
    assert.throws(
      () => authService.refresh({ refreshToken: loginResult.refreshToken, env, store }),
      { statusCode: 401 }
    );
  });

  test('refresh rejeita token revogado', () => {
    const loginResult = authService.login({ email: 'novo@example.com', password: PWD, env, store });
    authService.logout({ refreshToken: loginResult.refreshToken, env, store });
    assert.throws(
      () => authService.refresh({ refreshToken: loginResult.refreshToken, env, store }),
      { statusCode: 401 }
    );
  });

  test('logout revoga o refresh token (conta de tokens ativos diminui)', () => {
    const loginResult = authService.login({ email: 'novo@example.com', password: PWD, env, store });
    const before = store.activeRefreshTokenCount;
    authService.logout({ refreshToken: loginResult.refreshToken, env, store });
    assert.equal(store.activeRefreshTokenCount, before - 1);
  });
});

describe('endpoints HTTP', () => {
  let server;
  let baseUrl;
  const app = createApp({ env, store: new UserStore() });

  before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  async function request(path, { method = 'GET', body, token, cookie } = {}) {
    const headers = {};
    if (body) headers['content-type'] = 'application/json';
    if (token) headers['authorization'] = `Bearer ${token}`;
    if (cookie) headers['cookie'] = cookie;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
  }

  function refreshCookie(setCookie) {
    const match = /refreshToken=([^;]+)/.exec(setCookie ?? '');
    return match ? `refreshToken=${match[1]}` : null;
  }

  test('GET /health retorna 200 com status ok', async () => {
    const res = await request('/health');
    assert.equal(res.status, 200);
    assert.equal(res.json.status, 'ok');
  });

  test('POST /auth/register retorna 201', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    assert.equal(res.status, 201);
    assert.equal(res.json.user.email, 'api@example.com');
  });

  test('POST /auth/register rejeita e-mail duplicado (409)', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    assert.equal(res.status, 409);
  });

  test('POST /auth/login retorna tokens e cookie de refresh', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    assert.equal(res.status, 200);
    assert.ok(res.json.accessToken);
    assert.ok(refreshCookie(res.setCookie));
  });

  test('GET /auth/me retorna 401 sem token', async () => {
    const res = await request('/auth/me');
    assert.equal(res.status, 401);
  });

  test('GET /auth/me retorna o usuário com token válido', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    const res = await request('/auth/me', { token: loginRes.json.accessToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.user.email, 'api@example.com');
  });

  test('POST /auth/refresh troca access token e rotaciona o refresh token', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    const cookie = refreshCookie(loginRes.setCookie);
    const res = await request('/auth/refresh', { method: 'POST', cookie });
    assert.equal(res.status, 200);
    assert.ok(res.json.accessToken);
    assert.notEqual(refreshCookie(res.setCookie), cookie);
  });

  test('refresh token já rotacionado é rejeitado (reuso bloqueado)', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    const cookie = refreshCookie(loginRes.setCookie);
    await request('/auth/refresh', { method: 'POST', cookie });
    const res = await request('/auth/refresh', { method: 'POST', cookie });
    assert.equal(res.status, 401);
  });

  test('POST /auth/logout revoga o refresh token', async () => {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'api@example.com', password: PWD },
    });
    const cookie = refreshCookie(loginRes.setCookie);
    const out = await request('/auth/logout', { method: 'POST', cookie });
    assert.equal(out.status, 200);
    const res = await request('/auth/refresh', { method: 'POST', cookie });
    assert.equal(res.status, 401);
  });

  test('rota inexistente retorna 404', async () => {
    const res = await request('/nao-existe');
    assert.equal(res.status, 404);
  });
});
