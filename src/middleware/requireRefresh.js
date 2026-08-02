/**
 * Express middleware that validates a refresh token and stores the rotated
 * session result for the next handler.
 *
 * @module middleware/requireRefresh
 */

import { refresh } from '../services/authService.js';

/**
 * Builds the refresh-token middleware factory.
 *
 * @param {object} env - The environment config with JWT secrets.
 * @param {object} store - The user store used to persist/consume refresh tokens.
 * @returns {Function} Express middleware. Reads the refresh token from the
 *   `refreshToken` cookie or request body, rotates the session, and exposes
 *   `res.locals.refreshResult`. Responds with HTTP 401 on invalid/expired
 *   tokens.
 */
export function requireRefresh(env, store) {
  return (req, res, next) => {
    const token = req.cookies?.refreshToken ?? req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'Refresh token ausente' });
    }
    try {
      const result = refresh({ refreshToken: token, env, store });
      res.locals.refreshResult = result;
      return next();
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido, revogado ou expirado' });
    }
  };
}
