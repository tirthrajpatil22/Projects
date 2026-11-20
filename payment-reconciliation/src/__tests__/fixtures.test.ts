import { describe, expect, it } from 'vitest';
import expected from '../fixtures/expected_outcomes.json';
import { loadOctoberReconciliation } from '../fixtures/load';
import type { Classification } from '../domain/types';

type ExpectedOutcome = { classification: string; bankRef: string | null; lagDays?: number; feeDiffMilli?: number };

describe('October 2026 fixtures vs expected_outcomes.json', () => {
  const { input, result } = loadOctoberReconciliation();
  const byId = new Map(result.platformOutcomes.map((o) => [o.rowId, o]));
  const outcomes = expected.platformOutcomes as Record<string, ExpectedOutcome>;

  it('classifies every platform row exactly once', () => {
    expect(result.platformOutcomes.map((o) => o.rowId).sort()).toEqual(Object.keys(outcomes).sort());
    expect(input.platformRows).toHaveLength(12);
  });

  it.each(Object.entries(outcomes))('%s → expected classification, bankRef and detail', (rowId, exp) => {
    const o = byId.get(rowId);
    expect(o).toBeDefined();
    expect(o!.classification).toBe(exp.classification);
    expect(o!.bankRef).toBe(exp.bankRef);
    if (exp.lagDays !== undefined) expect(o!.lagDays).toBe(exp.lagDays);
    if (exp.feeDiffMilli !== undefined) expect(o!.feeDiffMilli).toBe(exp.feeDiffMilli);
  });

  it('classificationCounts match and tally each platform row once', () => {
    for (const [cls, n] of Object.entries(expected.classificationCounts)) {
      expect(result.classificationCounts[cls as Classification], cls).toBe(n);
    }
    // Classifications not listed in the expected file must be zero.
    const listed = new Set(Object.keys(expected.classificationCounts));
    for (const [cls, n] of Object.entries(result.classificationCounts)) {
      if (!listed.has(cls)) expect(n, cls).toBe(0);
    }
    const platformTally = Object.values(expected.classificationCounts).reduce((a, b) => a + b, 0)
      - expected.classificationCounts.ORPHAN_BANK_SETTLEMENT;
    expect(platformTally).toBe(result.platformOutcomes.length);
  });

  it('every bridge value matches', () => {
    for (const [k, v] of Object.entries(expected.bridge)) {
      expect(result.bridge[k as keyof typeof result.bridge], k).toBe(v);
    }
    expect(result.bridge).toEqual(expected.bridge);
  });

  it('control totals: FAIL at the aggregate level, rounding rows within tolerance individually', () => {
    const ct = result.controlTotals;
    expect(ct.rowToleranceMilli).toBe(expected.controlTotals.rowToleranceMilli);
    expect(ct.controlToleranceMilli).toBe(expected.controlTotals.controlToleranceMilli);
    expect(ct.rowsWithinTolerance).toBe(expected.controlTotals.rowsWithinTolerance);
    expect(ct.controlTotalStatus).toBe(expected.controlTotals.controlTotalStatus);
    expect(ct.aggregateFeeDiffMilli).toBe(1750);

    const rounding = result.platformOutcomes.filter((o) => o.classification === 'MATCHED_ROUNDING_WITHIN_TOLERANCE');
    expect(rounding).toHaveLength(6);
    for (const o of rounding) {
      expect(o.fee?.withinRowTolerance, o.rowId).toBe(true);
      expect(Math.abs(o.fee!.feeDiffMilli)).toBeLessThanOrEqual(expected.controlTotals.rowToleranceMilli);
    }
  });

  it('November rows are only used for verification, never as orphans', () => {
    const nov = result.bankOutcomes.filter((b) => b.period === 'NOV');
    expect(nov.map((b) => [b.settlementId, b.matchedPlatformRowId, b.classification])).toEqual([['S-010', 'P-003', null]]);
  });
});
