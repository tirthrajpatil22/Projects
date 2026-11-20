import { Classification, type BankOutcome, type PlatformOutcome, type ReconcileResult } from '../domain/types';

export type Tone = 'green' | 'amber' | 'red';

export const CLASSIFICATION_TONE: Record<Classification, Tone> = {
  MATCHED: 'green',
  MATCHED_ROUNDING_WITHIN_TOLERANCE: 'amber',
  TIMING_IN_TRANSIT: 'amber',
  DUPLICATE_PLATFORM_ENTRY: 'red',
  ORPHAN_REFUND: 'red',
  MISSING_SETTLEMENT: 'red',
  AMOUNT_MISMATCH: 'red',
  ORPHAN_BANK_SETTLEMENT: 'red',
  DUPLICATE_BANK_ENTRY: 'red',
};

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  MATCHED: 'Matched',
  MATCHED_ROUNDING_WITHIN_TOLERANCE: 'Matched – rounding within tolerance',
  TIMING_IN_TRANSIT: 'Timing – in transit',
  DUPLICATE_PLATFORM_ENTRY: 'Duplicate platform entry',
  ORPHAN_REFUND: 'Orphan refund',
  MISSING_SETTLEMENT: 'Missing settlement',
  AMOUNT_MISMATCH: 'Amount mismatch',
  ORPHAN_BANK_SETTLEMENT: 'Orphan bank settlement',
  DUPLICATE_BANK_ENTRY: 'Duplicate bank entry',
};

export const TONE_BADGE: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
};
export const TONE_BAR: Record<Tone, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
};
export const TONE_DOT: Record<Tone, string> = TONE_BAR;

/** A row shown in the record tables: either a platform row or an unmatched bank row. */
export interface RecordItem {
  id: string;
  txnId: string;
  eventType: string;
  amountMinor: number;
  classification: Classification;
  reason: string;
  platform?: PlatformOutcome;
  bank?: BankOutcome;
}

export function platformItem(o: PlatformOutcome): RecordItem {
  return {
    id: o.rowId,
    txnId: o.row.txn_id,
    eventType: o.row.event_type,
    amountMinor: o.row.amount_minor,
    classification: o.classification,
    reason: o.reason,
    platform: o,
  };
}

export function bankItem(b: BankOutcome & { classification: Classification }): RecordItem {
  return {
    id: b.settlementId,
    txnId: b.row.txn_id,
    eventType: b.row.event_type,
    amountMinor: b.row.gross_minor,
    classification: b.classification,
    reason: b.reason,
    bank: b,
  };
}

/** Everything that is not a clean MATCHED: platform exceptions plus flagged bank rows. */
export function exceptionItems(result: ReconcileResult): RecordItem[] {
  const platform = result.platformOutcomes
    .filter((o) => o.classification !== Classification.MATCHED)
    .map(platformItem);
  const bank = result.bankOutcomes
    .filter((b): b is BankOutcome & { classification: Classification } => b.classification !== null)
    .map(bankItem);
  return [...platform, ...bank];
}
