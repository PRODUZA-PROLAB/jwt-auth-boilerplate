import { Router } from 'express';
import { createAuthController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRefresh } from '../middleware/requireRefresh.js';

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
