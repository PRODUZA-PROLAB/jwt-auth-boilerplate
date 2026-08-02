/**
 * Auth route registration.
 *
 * @module routes/authRoutes
 */

import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRefresh } from '../middleware/requireRefresh.js';

/**
 * Creates an Express router exposing the auth endpoints.
 *
 * @param {object} deps - Route dependencies.
 * @param {object} deps.env - The environment config.
 * @param {object} deps.store - The user store instance.
 * @returns {object} An Express `Router` with `/register`, `/login`,
 *   `/refresh`, `/logout`, and `/me` endpoints.
 */
export function createAuthRouter({ env, store }) {
  const router = Router();
  const controller = createAuthController({ env, store });
  const protect = authenticate(env, store);
  const requireValidRefresh = requireRefresh(env, store);

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', requireValidRefresh, controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', protect, controller.me);

  return router;
}
