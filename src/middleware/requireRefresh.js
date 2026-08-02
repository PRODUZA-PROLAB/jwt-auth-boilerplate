import { refresh } from '../services/authService.js';

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
