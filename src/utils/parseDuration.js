/**
 * Duration parsing utilities.
 *
 * @module utils/parseDuration
 */

const UNITS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * Parses a human-readable duration string into milliseconds.
 *
 * @param {string} value - Duration in the form of a number followed by a unit
 *   (`s`, `m`, `h`, or `d`), e.g. `"15m"` or `"7d"`.
 * @returns {number} The duration in milliseconds.
 * @throws {Error} When `value` is not a string or does not match the expected
 *   format.
 */
export function parseDuration(value) {
  if (typeof value !== 'string') {
    throw new Error(`Duração inválida: ${String(value)}`);
  }
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Duração inválida: ${value}`);
  }
  return Number(match[1]) * UNITS[match[2]];
}
