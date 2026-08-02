/**
 * Authentication business logic: register, login, refresh rotation, and logout.
 *
 * @module services/authService
 */

import { hashPassword, verifyPassword } from '../utils/password.js';
import { assertValidCredentials, httpError } from '../utils/validation.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from './tokenService.js';

/**
 * Strips sensitive fields from a stored user before returning it to callers.
 *
 * @param {object} user - The stored user record.
 * @returns {object} Public user object with `id`, `email`, `role`, and
 *   `createdAt`.
 */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

/**
 * Registers a new user with a hashed password.
 *
 * @param {object} args - Registration arguments.
 * @param {string} args.email - The user email.
 * @param {string} args.password - The plaintext password.
 * @param {object} args.env - The environment config with the password pepper.
 * @param {object} args.store - The user store instance.
 * @returns {object} The public user object of the newly created user.
 * @throws {Error} With HTTP status when credentials are invalid or the email is
 *   already registered.
 */
export function register({ email, password, env, store }) {
  const { email: normalized } = assertValidCredentials({ email, password });
  const passwordHash = hashPassword(password, env.password.pepper);
  const user = store.createUser({ email: normalized, passwordHash });
  return toPublicUser(user);
}

/**
 * Authenticates a user and issues a new access/refresh token pair.
 *
 * @param {object} args - Login arguments.
 * @param {string} args.email - The user email.
 * @param {string} args.password - The plaintext password.
 * @param {object} args.env - The environment config.
 * @param {object} args.store - The user store instance.
 * @returns {object} An object with `accessToken`, `refreshToken`, and the
 *   public `user`.
 * @throws {Error} With HTTP 401 when the credentials are invalid.
 */
export function login({ email, password, env, store }) {
  const { email: normalized, password: pwd } = assertValidCredentials({ email, password });
  const user = store.findByEmail(normalized);
  if (!user || !verifyPassword(pwd, user.passwordHash, env.password.pepper)) {
    throw httpError(401, 'Credenciais inválidas');
  }
  const accessToken = generateAccessToken(user, env);
  const refresh = generateRefreshToken(user, env);
  store.storeRefreshToken({ jti: refresh.jti, userId: user.id, expiresAt: refresh.expiresAt });
  return {
    accessToken,
    refreshToken: refresh.token,
    user: toPublicUser(user),
  };
}

/**
 * Rotates a refresh token, consuming the old one and issuing a fresh pair.
 *
 * @param {object} args - Refresh arguments.
 * @param {string} args.refreshToken - The refresh token to validate and rotate.
 * @param {object} args.env - The environment config.
 * @param {object} args.store - The user store instance.
 * @returns {object} An object with a new `accessToken`, `refreshToken`, and the
 *   public `user`.
 * @throws {Error} With HTTP 401 when the token is invalid, expired, revoked, or
 *   already consumed, or the user is unknown.
 */
export function refresh({ refreshToken, env, store }) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken, env);
  } catch {
    throw httpError(401, 'Refresh token inválido ou expirado');
  }
  const record = store.consumeRefreshToken(payload.jti);
  if (!record) {
    throw httpError(401, 'Refresh token revogado ou já utilizado');
  }
  const user = store.findById(record.userId);
  if (!user) {
    throw httpError(401, 'Usuário não encontrado');
  }
  const accessToken = generateAccessToken(user, env);
  const next = generateRefreshToken(user, env);
  store.storeRefreshToken({ jti: next.jti, userId: user.id, expiresAt: next.expiresAt });
  return {
    accessToken,
    refreshToken: next.token,
    user: toPublicUser(user),
  };
}

/**
 * Revokes a refresh token so it can no longer be used.
 *
 * @param {object} args - Logout arguments.
 * @param {string|undefined} args.refreshToken - The refresh token to revoke.
 * @param {object} args.env - The environment config.
 * @param {object} args.store - The user store instance.
 * @returns {void}
 */
export function logout({ refreshToken, env, store }) {
  if (!refreshToken) return;
  let payload = null;
  try {
    payload = verifyRefreshToken(refreshToken, env);
  } catch {
    return;
  }
  if (payload.jti) {
    store.consumeRefreshToken(payload.jti);
  }
}
