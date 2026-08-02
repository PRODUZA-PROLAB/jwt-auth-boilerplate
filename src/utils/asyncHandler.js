/**
 * Async/error handling helpers for Express handlers.
 *
 * @module utils/asyncHandler
 */

/**
 * Wraps an Express handler so synchronous errors are forwarded to the error
 * middleware.
 *
 * @param {Function} fn - The handler function to wrap.
 * @returns {Function} An Express middleware that calls `fn` and forwards any
 *   thrown error via `next(err)`.
 */
export function handle(fn) {
  return (req, res, next) => {
    try {
      fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}
