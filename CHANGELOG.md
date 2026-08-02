# Changelog

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-08-01

### Adicionado

- Registro de usuários com validação de e-mail e política de senha (mínimo 8, máximo 128 caracteres).
- Login com emissão de access token JWT (HS256) com claims `sub`, `email`, `role` e `typ: access`.
- Refresh token rotativo: cada uso do refresh token revoga o token anterior e emite um novo com `jti` único.
- Logout com revogação imediata do refresh token no armazenamento.
- Middleware `authenticate` para proteção de rotas autenticadas e `requireRefresh` para rota de renovação.
- Hashing de senha com `scrypt` (crypto nativo do Node), salt aleatório por usuário e suporte a pepper.
- `UserStore` em memória com separação clara de responsabilidades (config, utils, services, controllers, middleware, routes).
- Validação de variáveis de ambiente em produção com falha ruidosa no boot quando segredos estiverem ausentes.
- Rota `/health` para verificação de saúde da API.
- Suite de testes com `node:test` cobrindo hashing, validação, utilitários, tokens e endpoints HTTP.
- Documentação completa: README, env.example, LICENSE (MIT) e scripts dev/start/build/lint/test.
