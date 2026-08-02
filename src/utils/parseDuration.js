const UNITS = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

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
