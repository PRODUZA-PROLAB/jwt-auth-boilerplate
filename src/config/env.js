/**
 * Environment configuration loader.
 *
 * @module config/env
 */

import crypto from 'node:crypto';
import { parseDuration } from '../utils/parseDuration.js';

const REQUIRED_IN_PRODUCTION = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

/**
 * Reads and validates environment variables, deriving a normalized config
 * object with JWT and password settings.
 *
 * @returns {object} The environment config:
 *   - `nodeEnv` {string} - The `NODE_ENV` value, defaulting to `"development"`.
 *   - `isProduction` {boolean} - Whether `NODE_ENV` is `"production"`.
 *   - `port` {number} - The HTTP port, defaulting to `3000`.
 *   - `jwt` {object} - Access/refresh secrets and TTLs (string and milliseconds).
 *   - `password` {object} - `pepper` used to hash passwords.
 * @throws {Error} When a required variable is missing in production.
 */
function readEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) {
        throw new Error(`[config] Variável de ambiente obrigatória ausente: ${key}`);
      }
    }
  }

  const accessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
  const refreshTtl = process.env.JWT_REFRESH_TTL ?? '7d';

  const accessSecret = process.env.JWT_ACCESS_SECRET ?? crypto.randomBytes(32).toString('hex');
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? crypto.randomBytes(32).toString('hex');

  return {
    nodeEnv,
    isProduction,
    port: Number(process.env.PORT ?? 3000),
    jwt: {
      accessSecret,
      refreshSecret,
      accessTtl,
      refreshTtl,
      accessTtlMs: parseDuration(accessTtl),
      refreshTtlMs: parseDuration(refreshTtl),
    },
    password: {
      pepper: process.env.PASSWORD_PEPPER ?? 'dev-pepper',
    },
  };
}

export const env = readEnv();
