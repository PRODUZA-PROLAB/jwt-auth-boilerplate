import { hashPassword, verifyPassword } from '../utils/password.js';
import { assertValidCredentials, httpError } from '../utils/validation.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from './tokenService.js';

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function register({ email, password, env, store }) {
  const { email: normalized } = assertValidCredentials({ email, password });
  const passwordHash = hashPassword(password, env.password.pepper);
  const user = store.createUser({ email: normalized, passwordHash });
  return toPublicUser(user);
}

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
