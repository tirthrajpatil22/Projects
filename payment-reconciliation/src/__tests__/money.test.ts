import { describe, expect, it } from 'vitest';
import {
  feeMilli,
  formatFeeDiff,
  formatINR,
  milliToPaiseString,
  minorToMilli,
  ROW_TOLERANCE_MILLI,
  withinTolerance,
} from '../domain/money';

const AMOUNTS = [1003, 1007, 1011, 1013, 1017, 1019];

describe('feeMilli', () => {
  it('computes 2.5% exactly in milli-paise', () => {
    expect(AMOUNTS.map((a) => feeMilli(a))).toEqual([25075, 25175, 25275, 25325, 25425, 25475]);
    expect(feeMilli(1003, 250)).toBe(1003 * 25);
  });

  it('gives row differences of 75..475 milli-paise against a 25 paise bank fee', () => {
    const bankFeeMilli = minorToMilli(25);
    expect(bankFeeMilli).toBe(25000);
    expect(AMOUNTS.map((a) => feeMilli(a) - bankFeeMilli)).toEqual([75, 175, 275, 325, 425, 475]);
  });

  it('refuses to round a fee that is not a whole milli-paisa', () => {
    expect(() => feeMilli(1, 1)).toThrow();
  });
});

describe('tolerance', () => {
  it('is inclusive at 500 milli-paise', () => {
    expect(ROW_TOLERANCE_MILLI).toBe(500);
    expect(withinTolerance(500, ROW_TOLERANCE_MILLI)).toBe(true);
    expect(withinTolerance(-500, ROW_TOLERANCE_MILLI)).toBe(true);
    expect(withinTolerance(501, ROW_TOLERANCE_MILLI)).toBe(false);
  });
});

describe('formatting', () => {
  it('renders milli-paise as exact decimal paise', () => {
    expect(milliToPaiseString(1750)).toBe('1.75');
    expect(milliToPaiseString(25075)).toBe('25.075');
    expect(milliToPaiseString(4400000)).toBe('4400.00');
    expect(milliToPaiseString(-1750)).toBe('-1.75');
  });

  it('formats rupees and fee differences', () => {
    expect(formatINR(0)).toBe('₹0.00');
    expect(formatINR(176070)).toBe('₹1,760.70');
    expect(formatINR(34607000)).toBe('₹3,46,070.00');
    expect(formatFeeDiff(1750)).toBe('1.75 paise (1750 milli-paise)');
  });
});
