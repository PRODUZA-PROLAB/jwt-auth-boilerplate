/**
 * Express middleware that protects routes with a valid access token.
 *
 * @module middleware/authenticate
 */

import { verifyAccessToken } from '../services/tokenService.js';

/**
 * Builds the authentication middleware factory.
 *
 * @param {object} env - The environment config with JWT secrets.
 * @param {object} store - The user store used to resolve the token subject.
 * @returns {Function} Express middleware. Validates the `Authorization:
 *   Bearer <token>` header, loads the user, and attaches `req.user`. Responds
 *   with HTTP 401 when the token is missing, invalid, or the user is unknown.
 */
export function authenticate(env, store) {
  return (req, res, next) => {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Token de acesso ausente' });
    }
    try {
      const payload = verifyAccessToken(token, env);
      if (payload.typ !== 'access') {
        throw new Error('Tipo de token incorreto');
      }
      const user = store.findById(payload.sub);
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      req.user = { id: user.id, email: user.email, role: user.role };
      return next();
    } catch {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  };
}
