import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { parseDuration } from '../utils/parseDuration.js';

export function generateAccessToken(user, env) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, typ: 'access' },
    env.jwt.accessSecret,
    { algorithm: 'HS256', expiresIn: env.jwt.accessTtl }
  );
}

export function generateRefreshToken(user, env) {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: user.id, email: user.email, typ: 'refresh' },
    env.jwt.refreshSecret,
    { algorithm: 'HS256', expiresIn: env.jwt.refreshTtl, jwtid: jti }
  );
  return {
    token,
    jti,
    expiresAt: Date.now() + parseDuration(env.jwt.refreshTtl),
  };
}

export function verifyAccessToken(token, env) {
  return jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] });
}

export function verifyRefreshToken(token, env) {
  return jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'] });
}

export function decodeToken(token) {
  return jwt.decode(token);
}
