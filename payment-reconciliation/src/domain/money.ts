/**
 * Exact fixed-point money helpers. All amounts are integers:
 *   minor  = paise
 *   milli  = thousandths of a paisa ("milli-paise")
 * Floating point is used only at the very edge, to hand a value to Intl for display
 * or to expose an exact decimal (parsed from an exact string) in bridge output.
 */

export const MILLI_PER_MINOR = 1000;
export const BPS_DENOMINATOR = 10_000;
/** Contract fee rate: 2.5% = 250 basis points. */
export const CONTRACT_FEE_RATE_BPS = 250;
/** Row tolerance: |bank fee − expected fee| may be at most half a paisa. */
export const ROW_TOLERANCE_MILLI = 500;
/** Control tolerance on the aggregate fee difference. */
export const CONTROL_TOLERANCE_MILLI = 0;

function assertSafeInt(n: number, what: string): void {
  if (!Number.isSafeInteger(n)) throw new Error(`${what} must be a safe integer, got ${n}`);
}

/** Convert integer paise to integer milli-paise. */
export function minorToMilli(minor: number): number {
  assertSafeInt(minor, 'minor amount');
  const milli = minor * MILLI_PER_MINOR;
  assertSafeInt(milli, 'milli amount');
  return milli;
}

/**
 * Exact expected fee in milli-paise: amount × bps × 1000 / 10000 = amount × bps / 10.
 * At 250 bps this is amount × 25. Throws rather than rounding if the result is not
 * a whole number of milli-paise.
 */
export function feeMilli(amountMinor: number, feeRateBps: number = CONTRACT_FEE_RATE_BPS): number {
  assertSafeInt(amountMinor, 'amount');
  assertSafeInt(feeRateBps, 'fee rate');
  const numerator = amountMinor * feeRateBps * MILLI_PER_MINOR;
  assertSafeInt(numerator, 'fee numerator');
  if (numerator % BPS_DENOMINATOR !== 0) {
    throw new Error(`Fee for ${amountMinor} at ${feeRateBps} bps is not a whole number of milli-paise`);
  }
  return numerator / BPS_DENOMINATOR;
}

export function withinTolerance(diffMilli: number, toleranceMilli: number): boolean {
  return Math.abs(diffMilli) <= toleranceMilli;
}

/**
 * Exact decimal string of a milli-paise amount expressed in paise, e.g.
 * 1750 → "1.75", 25075 → "25.075", 4400000 → "4400.00". At least two decimals,
 * three only when the thousandths digit is non-zero. Never rounds.
 */
export function milliToPaiseString(milli: number): string {
  assertSafeInt(milli, 'milli amount');
  const neg = milli < 0;
  const abs = Math.abs(milli);
  const whole = Math.floor(abs / MILLI_PER_MINOR);
  let frac = String(abs % MILLI_PER_MINOR).padStart(3, '0');
  if (frac.endsWith('0')) frac = frac.slice(0, 2);
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

/** Decimal paise as a number, parsed from the exact string (for bridge output only). */
export function milliToPaise(milli: number): number {
  return Number(milliToPaiseString(milli));
}

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

/** Format integer paise as rupees, e.g. 176070 → "₹1,760.70". */
export function formatINR(minor: number): string {
  assertSafeInt(minor, 'minor amount');
  // Normalise -0 so a zero difference prints as ₹0.00.
  return inrFormatter.format(minor / 100 || 0);
}

/** Format integer paise in paise with grouping, e.g. 4400 → "4,400 paise". */
export function formatPaise(minor: number): string {
  return `${minor.toLocaleString('en-IN')} paise`;
}

/** Format milli-paise as paise with its milli figure, e.g. 1750 → "1.75 paise (1750 milli-paise)". */
export function formatFeeDiff(milli: number): string {
  return `${milliToPaiseString(milli)} paise (${milli} milli-paise)`;
}

/** Exact milli-paise shown as grouped decimal paise, e.g. 4401750 → "4,401.75 paise". */
export function formatMilliAsPaise(milli: number): string {
  const s = milliToPaiseString(milli);
  const neg = s.startsWith('-');
  const [whole, frac] = (neg ? s.slice(1) : s).split('.');
  return `${neg ? '−' : ''}${Number(whole).toLocaleString('en-IN')}.${frac} paise`;
}
