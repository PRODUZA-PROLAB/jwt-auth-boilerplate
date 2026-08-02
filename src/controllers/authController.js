/**
 * HTTP handlers for the authentication routes.
 *
 * @module controllers/authController
 */

import {
  register as registerUser,
  login,
  logout as revokeSession,
} from '../services/authService.js';
import { handle } from '../utils/asyncHandler.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_PATH = '/auth/refresh';

/**
 * Extracts the refresh token from the request cookies or body.
 *
 * @param {object} req - The Express request object.
 * @returns {string|undefined} The refresh token, if present.
 */
function extractRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
}

/**
 * Sets the HTTP-only refresh token cookie on the response.
 *
 * @param {object} res - The Express response object.
 * @param {string} token - The refresh token to store in the cookie.
 * @param {object} env - The environment config used to derive cookie flags.
 * @returns {void}
 */
function setRefreshCookie(res, token, env) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: REFRESH_PATH,
    maxAge: env.jwt.refreshTtlMs,
  });
}

/**
 * Creates the auth controller with handlers bound to the given env and store.
 *
 * @param {object} deps - Controller dependencies.
 * @param {object} deps.env - The environment config.
 * @param {object} deps.store - The user store instance.
 * @returns {object} Object of Express handlers: `register`, `login`, `refresh`,
 *   `logout`, and `me`.
 */
export function createAuthController({ env, store }) {
  return {
    register: handle((req, res) => {
      const user = registerUser({
        email: req.body?.email,
        password: req.body?.password,
        env,
        store,
      });
      res.status(201).json({ message: 'Usuário criado com sucesso', user });
    }),

    login: handle((req, res) => {
      const result = login({
        email: req.body?.email,
        password: req.body?.password,
        env,
        store,
      });
      setRefreshCookie(res, result.refreshToken, env);
      res.json({ accessToken: result.accessToken, user: result.user });
    }),

    refresh: handle((req, res) => {
      const result = res.locals.refreshResult;
      setRefreshCookie(res, result.refreshToken, env);
      res.json({ accessToken: result.accessToken });
    }),

    logout: handle((req, res) => {
      const token = extractRefreshToken(req) ?? req.body?.refreshToken;
      revokeSession({ refreshToken: token, env, store });
      res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
      res.json({ message: 'Logout realizado com sucesso' });
    }),

    me: handle((req, res) => {
      res.json({ user: req.user });
    }),
  };
}
