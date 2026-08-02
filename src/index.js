import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp({ env });

app.listen(env.port, () => {
  console.log(`jwt-auth-boilerplate rodando em http://localhost:${env.port}`);
});
