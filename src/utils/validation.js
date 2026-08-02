const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

export function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function assertValidCredentials({ email, password }) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw httpError(400, 'E-mail é obrigatório');
  }
  if (!isValidEmail(normalized)) {
    throw httpError(400, 'E-mail inválido');
  }
  if (!isValidPassword(password)) {
    throw httpError(400, `A senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres`);
  }
  return { email: normalized, password };
}
