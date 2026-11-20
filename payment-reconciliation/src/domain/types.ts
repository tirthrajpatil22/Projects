/** Classification of a reconciled record. Platform rows get exactly one; unmatched bank rows get ORPHAN_BANK_SETTLEMENT. */
export const Classification = {
  MATCHED: 'MATCHED',
  MATCHED_ROUNDING_WITHIN_TOLERANCE: 'MATCHED_ROUNDING_WITHIN_TOLERANCE',
  TIMING_IN_TRANSIT: 'TIMING_IN_TRANSIT',
  DUPLICATE_PLATFORM_ENTRY: 'DUPLICATE_PLATFORM_ENTRY',
  ORPHAN_REFUND: 'ORPHAN_REFUND',
  MISSING_SETTLEMENT: 'MISSING_SETTLEMENT',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  ORPHAN_BANK_SETTLEMENT: 'ORPHAN_BANK_SETTLEMENT',
  /** Bank-side duplicate (same txn_id appearing twice in the bank file). None in the fixture set. */
  DUPLICATE_BANK_ENTRY: 'DUPLICATE_BANK_ENTRY',
} as const;
export type Classification = (typeof Classification)[keyof typeof Classification];

export const ALL_CLASSIFICATIONS: readonly Classification[] = Object.values(Classification);

export type EventType = 'PAYMENT' | 'REFUND';

export interface PlatformRow {
  row_id: string;
  txn_id: string;
  event_type: EventType;
  status: string;
  /** Integer paise. */
  amount_minor: number;
  original_txn_id: string | null;
  /** "YYYY-MM-DD HH:MM:SS" in UTC. */
  created_at_utc: string;
}

export interface BankRow {
  settlement_id: string;
  txn_id: string;
  event_type: EventType;
  batch_id: string;
  /** "YYYY-MM-DD". */
  value_date: string;
  gross_minor: number;
  fee_minor: number;
  net_minor: number;
}

export interface ReconcileConfig {
  feeRateBps: number;
  rowToleranceMilli: number;
  controlToleranceMilli: number;
  settlementLagWindowDays: number;
}

export interface ReconcileInput {
  platformRows: PlatformRow[];
  bankRowsOct: BankRow[];
  bankRowsNov: BankRow[];
  priorPeriodPaymentTxnIds: string[];
  config: ReconcileConfig;
}

export interface FeeComparison {
  expectedFeeMilli: number;
  bankFeeMilli: number;
  /** expected − bank, in milli-paise (signed). */
  feeDiffMilli: number;
  withinRowTolerance: boolean;
}

export interface PlatformOutcome {
  rowId: string;
  row: PlatformRow;
  classification: Classification;
  /** settlement_id of the bank row this record was matched or verified against. */
  bankRef: string | null;
  bankRow: BankRow | null;
  /** Which bank file bankRow came from. */
  bankPeriod: 'OCT' | 'NOV' | null;
  /** Primary row for duplicates. */
  duplicateOf?: string;
  lagDays?: number;
  feeDiffMilli?: number;
  fee?: FeeComparison;
  /** Refunds only: did the bank amount equal the platform amount? */
  refundAmountMatches?: boolean;
  reason: string;
}

export interface BankOutcome {
  settlementId: string;
  row: BankRow;
  period: 'OCT' | 'NOV';
  classification: Classification | null;
  matchedPlatformRowId: string | null;
  duplicateOf?: string;
  reason: string;
}

/** Bridge figures. Gross/net/refund lines are integer paise; fee lines are exact decimal paise derived from milli-paise. */
export interface Bridge {
  platformCapturedPaymentsGross: number;
  lessTimingInTransitGross: number;
  lessDuplicatePlatformGross: number;
  expectedOctoberBankPaymentsGross: number;
  bankOctoberPaymentsGross: number;
  paymentGrossDifference: number;
  platformExpectedFees: number;
  bankFees: number;
  feeRoundingDifference: number;
  platformExpectedNet: number;
  bankNet: number;
  netDifference: number;
  platformRefunds: number;
  bankRefunds: number;
  refundsMatchedButOrphaned: number;
}

/** The same bridge figures in exact integer milli-paise (source of truth for Bridge). */
export interface BridgeMilli {
  platformExpectedFeesMilli: number;
  bankFeesMilli: number;
  feeRoundingDifferenceMilli: number;
  platformExpectedNetMilli: number;
  bankNetMilli: number;
  netDifferenceMilli: number;
}

export type ControlStatus = 'PASS' | 'FAIL';

export interface ControlTotals {
  rowToleranceMilli: number;
  controlToleranceMilli: number;
  rowsWithinTolerance: number;
  aggregateFeeDiffMilli: number;
  controlTotalStatus: ControlStatus;
}

export interface ReconcileResult {
  config: ReconcileConfig;
  platformOutcomes: PlatformOutcome[];
  bankOutcomes: BankOutcome[];
  /** Bank rows actually referenced by a platform outcome (Oct matches + Nov timing verifications). */
  bankRowsUsed: BankRow[];
  classificationCounts: Record<Classification, number>;
  bridge: Bridge;
  bridgeMilli: BridgeMilli;
  controlTotals: ControlTotals;
}
