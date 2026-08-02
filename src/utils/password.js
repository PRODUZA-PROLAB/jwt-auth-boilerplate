import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCHEME = 'scrypt';
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

export function hashPassword(plaintext, pepper = '') {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = scryptSync(`${plaintext}${pepper}`, salt, KEY_LENGTH);
  return `${SCHEME}:${salt}:${derived.toString('hex')}`;
}

export function verifyPassword(plaintext, stored, pepper = '') {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, hex] = stored.split(':');
  if (scheme !== SCHEME || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = scryptSync(`${plaintext}${pepper}`, salt, KEY_LENGTH);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
