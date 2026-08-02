/**
 * JWT token generation, verification, and decoding.
 *
 * @module services/tokenService
 */

import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { parseDuration } from '../utils/parseDuration.js';

/**
 * Signs a short-lived access token for a user.
 *
 * @param {object} user - The user record.
 * @param {object} env - The environment config with `jwt.accessSecret` and
 *   `jwt.accessTtl`.
 * @returns {string} A signed JWT access token.
 */
export function generateAccessToken(user, env) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, typ: 'access' },
    env.jwt.accessSecret,
    { algorithm: 'HS256', expiresIn: env.jwt.accessTtl }
  );
}

/**
 * Signs a long-lived refresh token with a unique `jti` and computes its
 * expiration.
 *
 * @param {object} user - The user record.
 * @param {object} env - The environment config with `jwt.refreshSecret` and
 *   `jwt.refreshTtl`.
 * @returns {object} An object with the signed `token`, its `jti`, and the
 *   `expiresAt` epoch timestamp in milliseconds.
 */
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

/**
 * Verifies the signature and expiry of an access token.
 *
 * @param {string} token - The JWT access token.
 * @param {object} env - The environment config with `jwt.accessSecret`.
 * @returns {object} The decoded token payload.
 * @throws {Error} When the token is invalid or expired.
 */
export function verifyAccessToken(token, env) {
  return jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] });
}

/**
 * Verifies the signature and expiry of a refresh token.
 *
 * @param {string} token - The JWT refresh token.
 * @param {object} env - The environment config with `jwt.refreshSecret`.
 * @returns {object} The decoded token payload.
 * @throws {Error} When the token is invalid or expired.
 */
export function verifyRefreshToken(token, env) {
  return jwt.verify(token, env.jwt.refreshSecret, { algorithms: ['HS256'] });
}

/**
 * Decodes a JWT without verifying its signature.
 *
 * @param {string} token - The JWT to decode.
 * @returns {object|null} The decoded payload, or `null` when the token is
 *   malformed.
 */
export function decodeToken(token) {
  return jwt.decode(token);
}
