# jwt-auth-boilerplate

Boilerplate completo de autenticação JWT para **Node.js/Express**, escrito em JavaScript (ESM) puro, sem transpilação. Inclui registro, login, access token + refresh token **rotativo**, proteção de rotas e logout.

Projetado para ser a base de qualquer API autenticada: copie, configure as variáveis de ambiente, rode e adapte a camada de armazenamento ao seu banco de dados.

## Funcionalidades

- **Registro de usuários** com validação de e-mail e política de senha (8 a 128 caracteres).
- **Login** que emite um par de tokens: access token (curta duração) + refresh token (longa duração).
- **Refresh token rotativo**: a cada renovação, o token antigo é revogado e um novo é emitido — detecção de reuso e limite de janela de roubo (replay detection por design).
- **Proteção de rotas** via middleware `authenticate` (Bearer token).
- **Logout** que revoga o refresh token de forma imediata.
- **Hashing de senha com `scrypt`** (crypto nativo do Node), salt aleatório por usuário e suporte a `PASSWORD_PEPPER`.
- **Configuração por ambiente** com falha ruidosa no boot em produção se `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` estiverem ausentes.
- **Armazenamento em memória** (`UserStore`) com interface limpa para substituição por PostgreSQL/Redis/Mongo.
- **Testes** com `node:test` — 35 testes cobrindo utilitários, tokens, serviços e endpoints HTTP.
- **JavaScript puro (ESM)**: sem build de transpilação, roda direto com `npm start`.

## Stack

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js >= 18 |
| Framework | Express 4 |
| JWT | jsonwebtoken 9 |
| Cookies | cookie-parser |
| Senhas | scrypt (crypto nativo) |
| Testes | node:test (built-in) |

## Estrutura do projeto

```
jwt-auth-boilerplate/
├── env.example                  # Modelo de variáveis de ambiente (copie para .env)
├── src/
│   ├── index.js                 # Entry point — sobe o servidor
│   ├── app.js                   # Fábrica do app Express (rotas, middlewares, erros)
│   ├── config/
│   │   └── env.js               # Leitura e validação de variáveis de ambiente
│   ├── controllers/
│   │   └── authController.js    # Handlers HTTP: register, login, refresh, logout, me
│   ├── middleware/
│   │   ├── authenticate.js      # Protege rotas (valida access token)
│   │   └── requireRefresh.js    # Valida e rotaciona o refresh token
│   ├── routes/
│   │   └── authRoutes.js        # Rotas do módulo de autenticação
│   ├── services/
│   │   ├── authService.js       # Regras de negócio (register, login, refresh, logout)
│   │   └── tokenService.js      # Assinatura, verificação e rotação de tokens
│   ├── store/
│   │   └── userStore.js         # Armazenamento em memória (usuários + refresh tokens)
│   └── utils/
│       ├── asyncHandler.js      # Wrapper de tratamento de erros para handlers síncronos
│       ├── parseDuration.js     # Converte '15m', '7d' etc. em milissegundos
│       ├── password.js          # hashPassword / verifyPassword (scrypt)
│       └── validation.js        # Validação de e-mail, senha e credenciais
├── scripts/
│   └── build.js                 # Verificação de sintaxe de todos os fontes
├── test/
│   ├── index.js                 # Shim que importa a suite de testes
│   └── smoke.test.mjs           # 35 testes (node:test)
├── .gitignore
├── .prettierrc.json
├── CHANGELOG.md
├── LICENSE
└── package.json
```

## Começando

### 1. Pré-requisitos

- Node.js **>= 18** (testado com 18.x, 20.x e 24.x).

### 2. Instalação

```bash
npm install
```

### 3. Configuração

Copie o modelo de ambiente e preencha os valores:

```bash
cp env.example .env
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | não | `development`, `test` ou `production` |
| `PORT` | não | Porta HTTP (padrão 3000) |
| `JWT_ACCESS_SECRET` | sim (produção) | Segredo para assinar access tokens |
| `JWT_REFRESH_SECRET` | sim (produção) | Segredo para assinar refresh tokens |
| `JWT_ACCESS_TTL` | não | Validade do access token (padrão `15m`) |
| `JWT_REFRESH_TTL` | não | Validade do refresh token (padrão `7d`) |
| `PASSWORD_PEPPER` | não | Valor secreto extra aplicado no hashing da senha |

> **Nunca commite `.env`.** O `.gitignore` bloqueia `.env*`. Em produção, gere segredos com
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Em modo `development`, se os segredos não forem informados, eles são gerados aleatoriamente a cada boot. Em `production`, o servidor se recusa a subir sem eles (falha ruidosa).

### 4. Rodando

```bash
npm run dev       # desenvolvimento com reload automático
npm start         # produção / uso normal
npm run build     # verifica sintaxe de todos os fontes
npm run lint      # build + checagem de sintaxe dos testes
npm test          # roda a suíte de testes (node --test test/)
```

A API sobe em `http://localhost:3000` e a rota `/health` confirma o estado:

```bash
curl http://localhost:3000/health
# {"status":"ok","uptime":0.4}
```

## API

### `POST /auth/register`

Cria um usuário.

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"<sua-senha>"}'
```

**201** — usuário criado (sem `passwordHash`):

```json
{
  "message": "Usuário criado com sucesso",
  "user": { "id": "…", "email": "user@example.com", "role": "user", "createdAt": "…" }
}
```

Erros: `400` e-mail/senha inválidos, `409` e-mail duplicado.

### `POST /auth/login`

Autentica e devolve o access token; o refresh token vai em cookie `HttpOnly`.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"<sua-senha>"}'
```

**200**:

```json
{
  "accessToken": "<jwt-token>",
  "user": { "id": "…", "email": "user@example.com", "role": "user" }
}
```

Erro: `401` credenciais inválidas.

### `GET /auth/me`

Rota protegida pelo middleware `authenticate`. Envie `Authorization: Bearer <accessToken>`.

**200**:

```json
{ "user": { "id": "…", "email": "user@example.com", "role": "user" } }
```

Erro: `401` token ausente, inválido ou expirado.

### `POST /auth/refresh`

Rotaciona o refresh token. O token antigo é revogado no `UserStore` e um novo cookie é definido.

```bash
curl -X POST http://localhost:3000/auth/refresh -b cookies.txt -c cookies.txt
```

**200** — novo access token + novo refresh token (cookie):

```json
{ "accessToken": "<jwt-token>" }
```

Erro: `401` refresh token ausente, inválido, revogado ou já utilizado.

### `POST /auth/logout`

Revoga o refresh token e limpa o cookie. Não exige access token.

**200**:

```json
{ "message": "Logout realizado com sucesso" }
```

## Como funciona o fluxo de tokens

1. **Login**: valida credenciais, gera access token (`15m`) e refresh token (`7d`) com `jti` único. O `jti` é registrado no `UserStore`.
2. **Requisições**: o cliente envia `Authorization: Bearer <accessToken>`; o middleware `authenticate` verifica assinatura, tipo (`typ: access`) e usuário.
3. **Renovação**: ao expirar o access token, o cliente chama `/auth/refresh` com o refresh token. O servidor:
   - verifica a assinatura (HS256);
   - **consome** o `jti` do store (revogando o token atual);
   - emite um novo par de tokens;
   - registra o novo `jti`.
4. **Rotação**: qualquer uso do refresh token o invalida. Se um token vazado for reutilizado, o segundo uso falha com `401` — detecção de replay nativa.
5. **Logout**: o `jti` é removido do store; renovar com um token revogado retorna `401`.

> O `UserStore` é em memória: reiniciar o processo derruba as sessões ativas. Em produção, troque o store por Redis (revogação distribuída + expiração) ou PostgreSQL (tabela `refresh_tokens`).

## Segurança aplicada

- **Senhas**: `scrypt` com salt de 16 bytes por usuário + `timingSafeEqual` para comparação em tempo constante.
- **Claims mínimas**: `sub` (id do usuário), `email`, `role`, `typ` (tipo do token).
- **Algoritmo fixo**: verificação restrita a `HS256` (não aceita `none` ou `alg` negociado).
- **Refresh token em cookie `HttpOnly`** (`sameSite: lax`, `secure` em produção, escopo `path=/auth/refresh`).
- **Separação de segredos**: segredo diferente para access e refresh.
- **Validação de entrada**: e-mail normalizado e validado, política de senha, erros com status code correto.

## Adicionando rotas protegidas

```js
import { createApp } from './src/app.js';
import { authenticate } from './src/middleware/authenticate.js';

const app = createApp();
const protect = authenticate(app.get('env'), /* store */);

app.get('/private', protect, (req, res) => {
  res.json({ message: `Olá, ${req.user.email}!` });
});
```

Na prática, registre novas rotas dentro de `createAuthRouter` ou crie novos módulos de rota passando `{ env, store }`.

## Testes

A suíte usa apenas `node:test` (sem dependência extra) e sobe o servidor real em porta efêmera com `fetch` global:

```bash
npm test
# node --test test/
```

São 35 testes cobrindo: hashing de senha, validação de e-mail/senha, `parseDuration`, emissão/verificação de tokens, token adulterado/expirado, rotação e revogação de refresh token, registro/login/logout/refresh via HTTP, rota protegida e 404.

## Limitações do boilerplate

- Armazenamento em memória (não persiste entre restarts).
- Sem refresh token persistente por dispositivo/sessão múltipla (o store é global por usuário).
- Sem verificação de e-mail, redefinição de senha ou 2FA.
- A rotação invalida o token antigo imediatamente; clientes que enviam requisições concorrentes de refresh precisam serializar ou tratar `401` com novo login.

## Roadmap sugerido

1. Trocar `UserStore` por Redis/PostgreSQL.
2. Família de tokens (device-based) com `sessionId`.
3. Rate limiting em `/auth/login` e `/auth/refresh`.
4. Refresh token rotation com family (deteccção de roubo) e redefinição de senha.
5. Integração com banco real via Prisma/Drizzle e migrações.

## Licença

MIT — veja [LICENSE](LICENSE).
