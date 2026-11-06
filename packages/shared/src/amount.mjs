// Decimal string <-> integer base-unit string conversion for uint256 token amounts. Written from scratch (F5).
const MAX = (1n << 256n) - 1n;

function checkDecimals(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) throw new Error('invalid_token_decimals');
}

export function parseHumanAmount(input, decimals) {
  checkDecimals(decimals);
  if (typeof input !== 'string' || input.length > 512) throw new Error('invalid_amount');
  const match = /^(\d+)(?:\.(\d+))?$/.exec(input);
  if (!match) throw new Error('invalid_amount');
  const [, whole, fraction = ''] = match;
  if (fraction.length > decimals) throw new Error('amount_precision');
  // Strip leading zeros before the size check so "000…1" is not mistaken for overflow.
  const digits = (whole + fraction.padEnd(decimals, '0')).replace(/^0+(?=\d)/, '');
  if (digits.length > 78) throw new Error('amount_overflow');
  const value = BigInt(digits);
  if (value > MAX) throw new Error('amount_overflow');
  return value.toString();
}

export function formatBaseUnits(input, decimals) {
  checkDecimals(decimals);
  if (typeof input !== 'string' || !/^(0|[1-9]\d{0,77})$/.test(input)) throw new Error('invalid_base_units');
  if (BigInt(input) > MAX) throw new Error('amount_overflow');
  const padded = input.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals);
  const fraction = padded.slice(padded.length - decimals).replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}
