// Converts common JWT-style durations ("7d", "12h", "30m", "45s") to
// milliseconds for cookie expiry. Invalid values fail loudly at startup/login.
export function durationToMilliseconds(value) {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(String(value).trim());
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const factors = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * factors[unit];
}
