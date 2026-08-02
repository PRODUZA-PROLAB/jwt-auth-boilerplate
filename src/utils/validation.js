/**
 * Input validation helpers for auth credentials.
 *
 * @module utils/validation
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Minimum allowed password length.
 * @type {number}
 */
export const PASSWORD_MIN = 8;
/**
 * Maximum allowed password length.
 * @type {number}
 */
export const PASSWORD_MAX = 128;

/**
 * Normalizes an email by trimming whitespace and lowercasing.
 *
 * @param {string} email - The raw email value.
 * @returns {string} The normalized email, or an empty string for non-strings.
 */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Checks whether an email is syntactically valid.
 *
 * @param {string} email - The email to validate.
 * @returns {boolean} `true` when the email is valid, `false` otherwise.
 */
export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && EMAIL_RE.test(email);
}

/**
 * Checks whether a password respects the length policy.
 *
 * @param {string} password - The password to validate.
 * @returns {boolean} `true` when the password length is between `PASSWORD_MIN`
 *   and `PASSWORD_MAX`, `false` otherwise.
 */
export function isValidPassword(password) {
  return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
}

/**
 * Builds an `Error` carrying an HTTP status code.
 *
 * @param {number} statusCode - The HTTP status code.
 * @param {string} message - The error message.
 * @returns {Error} An error with a `statusCode` property.
 */
export function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Validates registration/login credentials and returns them normalized.
 *
 * @param {object} args - Credentials to validate.
 * @param {string} args.email - The raw email.
 * @param {string} args.password - The plaintext password.
 * @returns {object} An object with the normalized `email` and the `password`.
 * @throws {Error} With HTTP 400 when any field is missing or invalid.
 */
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
