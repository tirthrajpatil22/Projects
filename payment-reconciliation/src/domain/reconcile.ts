import { computeBridge, computeControlTotals } from './bridge';
import { feeMilli, minorToMilli, milliToPaiseString, withinTolerance } from './money';
import {
  ALL_CLASSIFICATIONS,
  Classification,
  type BankOutcome,
  type BankRow,
  type PlatformOutcome,
  type PlatformRow,
  type ReconcileInput,
  type ReconcileResult,
} from './types';

export const DEFAULT_CONFIG = {
  feeRateBps: 250,
  rowToleranceMilli: 500,
  controlToleranceMilli: 0,
  settlementLagWindowDays: 3,
} as const;

const MS_PER_DAY = 86_400_000;

/** Days since epoch for a "YYYY-MM-DD..." string, interpreted as a UTC calendar date. */
function utcDayNumber(dateLike: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateLike);
  if (!m) throw new Error(`Invalid date: "${dateLike}"`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

/** Whole days from the capture's UTC date to the bank value date. */
export function lagDays(createdAtUtc: string, valueDate: string): number {
  return utcDayNumber(valueDate) - utcDayNumber(createdAtUtc);
}

/**
 * Split rows into primaries and duplicates by txn_id. Within a group the earliest
 * (by sortKey, then id) is primary; the rest point at it.
 */
function splitDuplicates<T>(
  rows: T[],
  txnId: (r: T) => string,
  sortKey: (r: T) => string,
  id: (r: T) => string,
): { primaries: T[]; duplicates: Map<T, T> } {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const g = groups.get(txnId(r));
    if (g) g.push(r);
    else groups.set(txnId(r), [r]);
  }
  const primaries = new Set<T>();
  const duplicates = new Map<T, T>();
  for (const group of groups.values()) {
    const sorted = [...group].sort((a, b) => {
      const k = sortKey(a).localeCompare(sortKey(b));
      return k !== 0 ? k : id(a).localeCompare(id(b));
    });
    primaries.add(sorted[0]);
    for (const dup of sorted.slice(1)) duplicates.set(dup, sorted[0]);
  }
  // Preserve original file order.
  return { primaries: rows.filter((r) => primaries.has(r)), duplicates };
}

const key = (txnId: string, eventType: string) => `${eventType}|${txnId}`;

/** Reconcile one period's platform records against bank settlements. Pure: no I/O, no mutation of inputs. */
export function reconcile(input: ReconcileInput): ReconcileResult {
  const { platformRows, bankRowsOct, bankRowsNov, priorPeriodPaymentTxnIds, config } = input;
  const outcomes = new Map<PlatformRow, PlatformOutcome>();
  const bankOutcomes = new Map<BankRow, BankOutcome>();

  // ---- Step 1: duplicate detection (platform and bank) ----
  const platform = splitDuplicates(platformRows, (r) => r.txn_id, (r) => r.created_at_utc, (r) => r.row_id);
  for (const [dup, primary] of platform.duplicates) {
    outcomes.set(dup, {
      rowId: dup.row_id,
      row: dup,
      classification: Classification.DUPLICATE_PLATFORM_ENTRY,
      bankRef: null,
      bankRow: null,
      bankPeriod: null,
      duplicateOf: primary.row_id,
      reason: `Same txn_id ${dup.txn_id} as ${primary.row_id} (created ${primary.created_at_utc}); later entry excluded from matching and totals.`,
    });
  }

  const bank = splitDuplicates(bankRowsOct, (r) => r.txn_id, (r) => r.value_date, (r) => r.settlement_id);
  for (const [dup, primary] of bank.duplicates) {
    bankOutcomes.set(dup, {
      settlementId: dup.settlement_id,
      row: dup,
      period: 'OCT',
      classification: Classification.DUPLICATE_BANK_ENTRY,
      matchedPlatformRowId: null,
      duplicateOf: primary.settlement_id,
      reason: `Same txn_id ${dup.txn_id} as bank settlement ${primary.settlement_id}; excluded from matching.`,
    });
  }

  const octIndex = new Map<string, BankRow>();
  for (const b of bank.primaries) octIndex.set(key(b.txn_id, b.event_type), b);
  const usedOct = new Set<BankRow>();
  const usedNov = new Set<BankRow>();

  const primaryPayments = platform.primaries.filter((r) => r.event_type === 'PAYMENT');
  const primaryRefunds = platform.primaries.filter((r) => r.event_type === 'REFUND');

  // ---- Step 2 & 3: payments — October match, then November timing verification ----
  for (const p of primaryPayments) {
    const b = octIndex.get(key(p.txn_id, 'PAYMENT'));
    if (b) {
      usedOct.add(b);
      outcomes.set(p, classifyPaymentMatch(p, b, config.feeRateBps, config.rowToleranceMilli));
      continue;
    }

    const nov = bankRowsNov.find((n) => {
      if (usedNov.has(n) || n.event_type !== 'PAYMENT' || n.txn_id !== p.txn_id) return false;
      if (n.gross_minor !== p.amount_minor) return false;
      const lag = lagDays(p.created_at_utc, n.value_date);
      return lag >= 0 && lag <= config.settlementLagWindowDays;
    });
    if (nov) {
      usedNov.add(nov);
      const lag = lagDays(p.created_at_utc, nov.value_date);
      outcomes.set(p, {
        rowId: p.row_id,
        row: p,
        classification: Classification.TIMING_IN_TRANSIT,
        bankRef: nov.settlement_id,
        bankRow: nov,
        bankPeriod: 'NOV',
        lagDays: lag,
        reason: `No October settlement. Verified by November settlement ${nov.settlement_id} (value date ${nov.value_date}, ${lag}-day lag, window ${config.settlementLagWindowDays} days).`,
      });
    } else {
      outcomes.set(p, {
        rowId: p.row_id,
        row: p,
        classification: Classification.MISSING_SETTLEMENT,
        bankRef: null,
        bankRow: null,
        bankPeriod: null,
        reason: `No October settlement and no November settlement with the same gross within ${config.settlementLagWindowDays} days.`,
      });
    }
  }

  // ---- Step 5: refunds ----
  const knownOriginals = new Set<string>([
    ...primaryPayments.map((p) => p.txn_id),
    ...priorPeriodPaymentTxnIds,
  ]);
  for (const r of primaryRefunds) {
    const b = octIndex.get(key(r.txn_id, 'REFUND')) ?? null;
    if (b) usedOct.add(b);
    const amountMatches = b !== null && b.gross_minor === r.amount_minor;
    const originalExists = r.original_txn_id !== null && knownOriginals.has(r.original_txn_id);
    const bankNote = b
      ? amountMatches
        ? `Bank ${b.settlement_id} amount matches.`
        : `Bank ${b.settlement_id} amount ${b.gross_minor} ≠ platform ${r.amount_minor}.`
      : 'No October bank refund settlement.';

    let classification: Classification;
    let reason: string;
    // Referential integrity takes precedence: an orphan is flagged even if the bank agrees.
    if (!originalExists) {
      classification = Classification.ORPHAN_REFUND;
      reason = `Original txn ${r.original_txn_id ?? '(blank)'} not found in October payments or prior-period payments. ${bankNote}`;
    } else if (!b) {
      classification = Classification.MISSING_SETTLEMENT;
      reason = bankNote;
    } else if (!amountMatches) {
      classification = Classification.AMOUNT_MISMATCH;
      reason = bankNote;
    } else {
      classification = Classification.MATCHED;
      reason = `Original ${r.original_txn_id} exists. ${bankNote}`;
    }
    outcomes.set(r, {
      rowId: r.row_id,
      row: r,
      classification,
      bankRef: b?.settlement_id ?? null,
      bankRow: b,
      bankPeriod: b ? 'OCT' : null,
      refundAmountMatches: amountMatches,
      reason,
    });
  }

  // ---- Step 4: unmatched October bank rows (November rows are never orphans) ----
  const platformByBank = new Map<BankRow, string>();
  for (const o of outcomes.values()) if (o.bankRow) platformByBank.set(o.bankRow, o.rowId);

  for (const b of bank.primaries) {
    if (usedOct.has(b)) {
      bankOutcomes.set(b, {
        settlementId: b.settlement_id,
        row: b,
        period: 'OCT',
        classification: null,
        matchedPlatformRowId: platformByBank.get(b) ?? null,
        reason: `Matched to platform ${platformByBank.get(b)}.`,
      });
    } else {
      bankOutcomes.set(b, {
        settlementId: b.settlement_id,
        row: b,
        period: 'OCT',
        classification: Classification.ORPHAN_BANK_SETTLEMENT,
        matchedPlatformRowId: null,
        reason: `No primary platform ${b.event_type.toLowerCase()} with txn_id ${b.txn_id}.`,
      });
    }
  }
  for (const n of bankRowsNov) {
    if (usedNov.has(n)) {
      bankOutcomes.set(n, {
        settlementId: n.settlement_id,
        row: n,
        period: 'NOV',
        classification: null,
        matchedPlatformRowId: platformByBank.get(n) ?? null,
        reason: `Used to verify timing item ${platformByBank.get(n)}.`,
      });
    }
  }

  const platformOutcomes = platformRows.map((r) => {
    const o = outcomes.get(r);
    if (!o) throw new Error(`Internal error: row ${r.row_id} was not classified`);
    return o;
  });
  const bankOutcomeList = [...bankRowsOct, ...bankRowsNov]
    .map((b) => bankOutcomes.get(b))
    .filter((b): b is BankOutcome => b !== undefined);

  const classificationCounts = Object.fromEntries(ALL_CLASSIFICATIONS.map((c) => [c, 0])) as Record<Classification, number>;
  for (const o of platformOutcomes) classificationCounts[o.classification]++;
  for (const b of bankOutcomeList) if (b.classification) classificationCounts[b.classification]++;

  const bankRowsUsed = platformOutcomes.flatMap((o) => (o.bankRow ? [o.bankRow] : []));

  const { bridge, bridgeMilli } = computeBridge(platformOutcomes, bankRowsOct, config.feeRateBps);
  const controlTotals = computeControlTotals(platformOutcomes, bridge, bridgeMilli, config);

  return {
    config,
    platformOutcomes,
    bankOutcomes: bankOutcomeList,
    bankRowsUsed,
    classificationCounts,
    bridge,
    bridgeMilli,
    controlTotals,
  };
}

function classifyPaymentMatch(p: PlatformRow, b: BankRow, feeRateBps: number, rowToleranceMilli: number): PlatformOutcome {
  const base = { rowId: p.row_id, row: p, bankRef: b.settlement_id, bankRow: b, bankPeriod: 'OCT' as const };
  if (b.gross_minor !== p.amount_minor) {
    return {
      ...base,
      classification: Classification.AMOUNT_MISMATCH,
      reason: `Gross differs: platform ${p.amount_minor} vs bank ${b.gross_minor} paise.`,
    };
  }
  const expectedFeeMilli = feeMilli(p.amount_minor, feeRateBps);
  const bankFeeMilli = minorToMilli(b.fee_minor);
  const feeDiffMilli = expectedFeeMilli - bankFeeMilli;
  const within = withinTolerance(feeDiffMilli, rowToleranceMilli);
  const fee = { expectedFeeMilli, bankFeeMilli, feeDiffMilli, withinRowTolerance: within };

  if (b.gross_minor - b.fee_minor !== b.net_minor) {
    // Conservative extra check: the bank row must be internally consistent.
    return {
      ...base,
      classification: Classification.AMOUNT_MISMATCH,
      fee,
      feeDiffMilli,
      reason: `Bank row inconsistent: gross ${b.gross_minor} − fee ${b.fee_minor} ≠ net ${b.net_minor}.`,
    };
  }
  if (feeDiffMilli === 0) {
    return { ...base, classification: Classification.MATCHED, fee, reason: 'Gross and fee agree exactly.' };
  }
  if (within) {
    return {
      ...base,
      classification: Classification.MATCHED_ROUNDING_WITHIN_TOLERANCE,
      fee,
      feeDiffMilli,
      reason: `Expected fee ${milliToPaiseString(expectedFeeMilli)} paise vs bank ${b.fee_minor} paise: ${feeDiffMilli} milli-paise, within ±${rowToleranceMilli}.`,
    };
  }
  return {
    ...base,
    classification: Classification.AMOUNT_MISMATCH,
    fee,
    feeDiffMilli,
    reason: `Fee difference ${feeDiffMilli} milli-paise exceeds row tolerance ±${rowToleranceMilli}.`,
  };
}
