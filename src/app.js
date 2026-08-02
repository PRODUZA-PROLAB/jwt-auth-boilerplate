/**
 * Express application factory for the JWT auth boilerplate.
 *
 * @module app
 */

import express from 'express';
import cookieParser from 'cookie-parser';
import { env as defaultEnv } from './config/env.js';
import { UserStore } from './store/userStore.js';
import { createAuthRouter } from './routes/authRoutes.js';

/**
 * Builds the Express application with health check, auth routes, and global
 * error handling.
 *
 * @param {object} [deps] - Optional dependencies for the app.
 * @param {object} [deps.env=defaultEnv] - The resolved environment config.
 * @param {UserStore} [deps.store] - The user store instance.
 * @returns {object} The configured Express `app`.
 */
export function createApp({ env = defaultEnv, store = new UserStore() } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.use('/auth', createAuthRouter({ env, store }));

  app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = err.statusCode ?? err.status ?? 500;
    const message = status >= 500 ? 'Erro interno do servidor' : err.message;
    if (status >= 500) {
      console.error(err);
    }
    res.status(status).json({ error: message });
  });

  return app;
}
