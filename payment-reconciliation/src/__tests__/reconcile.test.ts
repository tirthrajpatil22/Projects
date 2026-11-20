import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, reconcile } from '../domain/reconcile';
import type { BankRow, PlatformRow, ReconcileInput } from '../domain/types';

const pay = (row_id: string, txn_id: string, amount_minor: number, created_at_utc = '2026-10-10 10:00:00'): PlatformRow => ({
  row_id, txn_id, event_type: 'PAYMENT', status: 'CAPTURED', amount_minor, original_txn_id: null, created_at_utc,
});
const refund = (row_id: string, txn_id: string, amount_minor: number, original: string): PlatformRow => ({
  row_id, txn_id, event_type: 'REFUND', status: 'COMPLETED', amount_minor, original_txn_id: original, created_at_utc: '2026-10-20 10:00:00',
});
const settle = (settlement_id: string, txn_id: string, gross: number, fee: number, value_date = '2026-10-11', event_type: 'PAYMENT' | 'REFUND' = 'PAYMENT'): BankRow => ({
  settlement_id, txn_id, event_type, batch_id: 'B-1', value_date, gross_minor: gross, fee_minor: fee, net_minor: gross - fee,
});

function run(partial: Partial<ReconcileInput>) {
  const result = reconcile({
    platformRows: [],
    bankRowsOct: [],
    bankRowsNov: [],
    priorPeriodPaymentTxnIds: [],
    config: { ...DEFAULT_CONFIG },
    ...partial,
  });
  const byId = Object.fromEntries(result.platformOutcomes.map((o) => [o.rowId, o]));
  return { result, byId };
}

describe('reconcile rules', () => {
  it('duplicate detection marks only the later row', () => {
    const { byId, result } = run({
      // Deliberately out of file order: the later timestamp is listed first.
      platformRows: [pay('P-2', 'T1', 40000, '2026-10-10 10:00:05'), pay('P-1', 'T1', 40000, '2026-10-10 10:00:00')],
      bankRowsOct: [settle('S-1', 'T1', 40000, 1000)],
    });
    expect(byId['P-1'].classification).toBe('MATCHED');
    expect(byId['P-1'].bankRef).toBe('S-1');
    expect(byId['P-2'].classification).toBe('DUPLICATE_PLATFORM_ENTRY');
    expect(byId['P-2'].bankRef).toBeNull();
    expect(byId['P-2'].duplicateOf).toBe('P-1');
    expect(result.bridge.lessDuplicatePlatformGross).toBe(40000);
  });

  it('a payment with a November settlement inside the window is TIMING_IN_TRANSIT', () => {
    const { byId, result } = run({
      platformRows: [pay('P-1', 'T1', 120000, '2026-10-31 12:00:00')],
      bankRowsNov: [settle('S-9', 'T1', 120000, 3000, '2026-11-03')],
    });
    expect(byId['P-1'].classification).toBe('TIMING_IN_TRANSIT');
    expect(byId['P-1'].bankRef).toBe('S-9');
    expect(byId['P-1'].lagDays).toBe(3);
    expect(result.classificationCounts.ORPHAN_BANK_SETTLEMENT).toBe(0);
  });

  it('a November settlement outside the window does not count as timing', () => {
    const { byId } = run({
      platformRows: [pay('P-1', 'T1', 120000, '2026-10-31 12:00:00')],
      bankRowsNov: [settle('S-9', 'T1', 120000, 3000, '2026-11-04')],
    });
    expect(byId['P-1'].classification).toBe('MISSING_SETTLEMENT');
  });

  it('a payment with no settlement anywhere is MISSING_SETTLEMENT', () => {
    const { byId } = run({ platformRows: [pay('P-1', 'T1', 5000)] });
    expect(byId['P-1'].classification).toBe('MISSING_SETTLEMENT');
    expect(byId['P-1'].bankRef).toBeNull();
  });

  it('a fee difference just over tolerance (501 milli-paise) is AMOUNT_MISMATCH', () => {
    // At 250 bps every expected fee is a multiple of 25 milli-paise, so a 501 diff cannot occur.
    // Use 1 bps to construct it exactly: 5010 paise → 501 milli-paise expected, bank fee 0 → diff 501.
    const { byId } = run({
      platformRows: [pay('P-1', 'T1', 5010)],
      bankRowsOct: [settle('S-1', 'T1', 5010, 0)],
      config: { ...DEFAULT_CONFIG, feeRateBps: 1 },
    });
    expect(byId['P-1'].fee?.feeDiffMilli).toBe(501);
    expect(byId['P-1'].classification).toBe('AMOUNT_MISMATCH');
  });

  it('a fee difference exactly at tolerance (500 milli-paise) is MATCHED_ROUNDING_WITHIN_TOLERANCE', () => {
    // 250 bps: 1020 paise → 25500 milli; bank fee 25 paise = 25000 milli → diff exactly 500.
    const { byId } = run({
      platformRows: [pay('P-1', 'T1', 1020)],
      bankRowsOct: [settle('S-1', 'T1', 1020, 25)],
    });
    expect(byId['P-1'].feeDiffMilli).toBe(500);
    expect(byId['P-1'].classification).toBe('MATCHED_ROUNDING_WITHIN_TOLERANCE');
  });

  it('a gross mismatch is AMOUNT_MISMATCH', () => {
    const { byId } = run({
      platformRows: [pay('P-1', 'T1', 40000)],
      bankRowsOct: [settle('S-1', 'T1', 39000, 975)],
    });
    expect(byId['P-1'].classification).toBe('AMOUNT_MISMATCH');
  });

  it('a refund that matches the bank but has a missing original is ORPHAN_REFUND', () => {
    const { byId, result } = run({
      platformRows: [refund('P-R', 'R1', 30000, 'T-404')],
      bankRowsOct: [settle('S-R', 'R1', 30000, 0, '2026-10-21', 'REFUND')],
    });
    expect(byId['P-R'].classification).toBe('ORPHAN_REFUND');
    expect(byId['P-R'].bankRef).toBe('S-R');
    expect(result.bridge.refundsMatchedButOrphaned).toBe(1);
  });

  it('a refund whose original exists in priorPeriodPaymentTxnIds is MATCHED', () => {
    const { byId, result } = run({
      platformRows: [refund('P-R', 'R1', 30000, 'T-SEP')],
      bankRowsOct: [settle('S-R', 'R1', 30000, 0, '2026-10-21', 'REFUND')],
      priorPeriodPaymentTxnIds: ['T-SEP'],
    });
    expect(byId['P-R'].classification).toBe('MATCHED');
    expect(result.bridge.refundsMatchedButOrphaned).toBe(0);
  });

  it('an October bank payment with no platform row is ORPHAN_BANK_SETTLEMENT; November rows are never orphans', () => {
    const { result } = run({
      bankRowsOct: [settle('S-1', 'TX', 1000, 25)],
      bankRowsNov: [settle('S-2', 'TY', 1000, 25, '2026-11-02')],
    });
    expect(result.classificationCounts.ORPHAN_BANK_SETTLEMENT).toBe(1);
    expect(result.bankOutcomes.find((b) => b.settlementId === 'S-1')?.classification).toBe('ORPHAN_BANK_SETTLEMENT');
    expect(result.bankOutcomes.find((b) => b.settlementId === 'S-2')).toBeUndefined();
  });

  it('does not mutate its input', () => {
    const platformRows = [pay('P-2', 'T1', 100, '2026-10-10 10:00:05'), pay('P-1', 'T1', 100)];
    const snapshot = JSON.stringify(platformRows);
    run({ platformRows });
    expect(JSON.stringify(platformRows)).toBe(snapshot);
  });
});
