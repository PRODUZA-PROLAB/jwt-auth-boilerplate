import {
  register as registerUser,
  login,
  logout as revokeSession,
} from '../services/authService.js';
import { handle } from '../utils/asyncHandler.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_PATH = '/auth/refresh';

function extractRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE] ?? req.body?.refreshToken;
}

function setRefreshCookie(res, token, env) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: REFRESH_PATH,
    maxAge: env.jwt.refreshTtlMs,
  });
}

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
