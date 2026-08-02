import { randomUUID } from 'node:crypto';

export class UserStore {
  #usersByEmail = new Map();
  #usersById = new Map();
  #refreshTokens = new Map();

  createUser({ email, passwordHash }) {
    if (this.#usersByEmail.has(email)) {
      const err = new Error('E-mail já cadastrado');
      err.code = 'EMAIL_IN_USE';
      err.statusCode = 409;
      throw err;
    }
    const user = {
      id: randomUUID(),
      email,
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString(),
    };
    this.#usersByEmail.set(email, user);
    this.#usersById.set(user.id, user);
    return user;
  }

  findByEmail(email) {
    return this.#usersByEmail.get(email);
  }

  findById(id) {
    return this.#usersById.get(id);
  }

  storeRefreshToken({ jti, userId, expiresAt }) {
    this.#refreshTokens.set(jti, { userId, expiresAt });
  }

  consumeRefreshToken(jti) {
    if (!this.#refreshTokens.has(jti)) return null;
    const record = this.#refreshTokens.get(jti);
    this.#refreshTokens.delete(jti);
    return record;
  }

  revokeAllTokensForUser(userId) {
    for (const [jti, record] of this.#refreshTokens) {
      if (record.userId === userId) {
        this.#refreshTokens.delete(jti);
      }
    }
  }

  get activeRefreshTokenCount() {
    return this.#refreshTokens.size;
  }
}
