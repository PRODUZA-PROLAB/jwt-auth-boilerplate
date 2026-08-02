/**
 * Password hashing and verification using scrypt.
 *
 * @module utils/password
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCHEME = 'scrypt';
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/**
 * Hashes a plaintext password (plus an optional pepper) with scrypt.
 *
 * @param {string} plaintext - The plaintext password.
 * @param {string} [pepper=''] - A site-wide secret mixed into the input.
 * @returns {string} The encoded hash in the format `scrypt:<salt>:<hex>`.
 */
export function hashPassword(plaintext, pepper = '') {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derived = scryptSync(`${plaintext}${pepper}`, salt, KEY_LENGTH);
  return `${SCHEME}:${salt}:${derived.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored hash using a constant-time
 * comparison.
 *
 * @param {string} plaintext - The plaintext password to verify.
 * @param {string} stored - The stored encoded hash.
 * @param {string} [pepper=''] - The pepper used during hashing.
 * @returns {boolean} `true` when the password matches, `false` otherwise.
 */
export function verifyPassword(plaintext, stored, pepper = '') {
  if (typeof stored !== 'string') return false;
  const [scheme, salt, hex] = stored.split(':');
  if (scheme !== SCHEME || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = scryptSync(`${plaintext}${pepper}`, salt, KEY_LENGTH);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
