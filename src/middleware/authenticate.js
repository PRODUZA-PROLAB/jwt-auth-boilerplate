import { verifyAccessToken } from '../services/tokenService.js';

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
