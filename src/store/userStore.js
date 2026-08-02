/**
 * In-memory store for users and refresh tokens.
 *
 * @module store/userStore
 */

import { randomUUID } from 'node:crypto';

/**
 * In-memory user and refresh-token repository.
 */
export class UserStore {
  #usersByEmail = new Map();
  #usersById = new Map();
  #refreshTokens = new Map();

  /**
   * Creates and stores a new user.
   *
   * @param {object} args - User creation arguments.
   * @param {string} args.email - The normalized user email.
   * @param {string} args.passwordHash - The password hash.
   * @returns {object} The created user record.
   * @throws {Error} With `code = "EMAIL_IN_USE"` and `statusCode = 409` when the
   *   email is already registered.
   */
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

  /**
   * Finds a user by email.
   *
   * @param {string} email - The email to look up.
   * @returns {object|undefined} The user record, or `undefined` when not found.
   */
  findByEmail(email) {
    return this.#usersByEmail.get(email);
  }

  /**
   * Finds a user by id.
   *
   * @param {string} id - The user id to look up.
   * @returns {object|undefined} The user record, or `undefined` when not found.
   */
  findById(id) {
    return this.#usersById.get(id);
  }

  /**
   * Stores a refresh token association for a user.
   *
   * @param {object} args - Token storage arguments.
   * @param {string} args.jti - The token's unique id.
   * @param {string} args.userId - The owning user id.
   * @param {number} args.expiresAt - Expiration epoch timestamp in milliseconds.
   * @returns {void}
   */
  storeRefreshToken({ jti, userId, expiresAt }) {
    this.#refreshTokens.set(jti, { userId, expiresAt });
  }

  /**
   * Consumes (and removes) a refresh token, returning its record once.
   *
   * @param {string} jti - The token's unique id.
   * @returns {object|null} The stored record, or `null` when the token was not
   *   found (revoked or already consumed).
   */
  consumeRefreshToken(jti) {
    if (!this.#refreshTokens.has(jti)) return null;
    const record = this.#refreshTokens.get(jti);
    this.#refreshTokens.delete(jti);
    return record;
  }

  /**
   * Revokes every refresh token belonging to a user.
   *
   * @param {string} userId - The user whose tokens should be revoked.
   * @returns {void}
   */
  revokeAllTokensForUser(userId) {
    for (const [jti, record] of this.#refreshTokens) {
      if (record.userId === userId) {
        this.#refreshTokens.delete(jti);
      }
    }
  }

  /**
   * Number of active refresh tokens currently stored.
   *
   * @type {number}
   */
  get activeRefreshTokenCount() {
    return this.#refreshTokens.size;
  }
}
