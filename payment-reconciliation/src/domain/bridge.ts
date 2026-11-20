import { feeMilli, minorToMilli, milliToPaise, withinTolerance } from './money';
import {
  Classification,
  type BankRow,
  type Bridge,
  type BridgeMilli,
  type ControlTotals,
  type PlatformOutcome,
  type ReconcileConfig,
} from './types';

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const isCapturedPayment = (o: PlatformOutcome) => o.row.event_type === 'PAYMENT' && o.row.status === 'CAPTURED';

/**
 * Payment bridge from platform captures to October bank receipts, plus fee and refund lines.
 * Pure function of the October result set. All arithmetic is in integer paise / milli-paise;
 * fee lines are converted to decimal paise only at the output.
 */
export function computeBridge(
  outcomes: PlatformOutcome[],
  bankRowsOct: BankRow[],
  feeRateBps: number,
): { bridge: Bridge; bridgeMilli: BridgeMilli } {
  const captured = outcomes.filter(isCapturedPayment);
  // Starting line includes every captured payment row as recorded on the platform
  // (duplicates included), so the duplicate can be shown as an explicit reconciling item.
  const platformCapturedPaymentsGross = sum(captured.map((o) => o.row.amount_minor));
  const timing = captured.filter((o) => o.classification === Classification.TIMING_IN_TRANSIT);
  const duplicates = captured.filter((o) => o.classification === Classification.DUPLICATE_PLATFORM_ENTRY);
  const lessTimingInTransitGross = sum(timing.map((o) => o.row.amount_minor));
  const lessDuplicatePlatformGross = sum(duplicates.map((o) => o.row.amount_minor));
  const expectedOctoberBankPaymentsGross =
    platformCapturedPaymentsGross - lessTimingInTransitGross - lessDuplicatePlatformGross;

  const bankPayments = bankRowsOct.filter((b) => b.event_type === 'PAYMENT');
  const bankOctoberPaymentsGross = sum(bankPayments.map((b) => b.gross_minor));
  const paymentGrossDifference = expectedOctoberBankPaymentsGross - bankOctoberPaymentsGross;

  // Same set as expectedOctoberBankPaymentsGross: captured, not timing, not duplicate.
  const expectedSet = captured.filter(
    (o) =>
      o.classification !== Classification.TIMING_IN_TRANSIT &&
      o.classification !== Classification.DUPLICATE_PLATFORM_ENTRY,
  );
  const platformExpectedFeesMilli = sum(expectedSet.map((o) => feeMilli(o.row.amount_minor, feeRateBps)));
  const bankFeesMilli = sum(bankPayments.map((b) => minorToMilli(b.fee_minor)));
  const feeRoundingDifferenceMilli = platformExpectedFeesMilli - bankFeesMilli;
  const platformExpectedNetMilli = minorToMilli(expectedOctoberBankPaymentsGross) - platformExpectedFeesMilli;
  const bankNetMilli = sum(bankPayments.map((b) => minorToMilli(b.net_minor)));
  const netDifferenceMilli = bankNetMilli - platformExpectedNetMilli;

  const refunds = outcomes.filter(
    (o) => o.row.event_type === 'REFUND' && o.classification !== Classification.DUPLICATE_PLATFORM_ENTRY,
  );
  const platformRefunds = sum(refunds.map((o) => o.row.amount_minor));
  const bankRefunds = sum(bankRowsOct.filter((b) => b.event_type === 'REFUND').map((b) => b.gross_minor));
  const refundsMatchedButOrphaned = refunds.filter(
    (o) => o.classification === Classification.ORPHAN_REFUND && o.refundAmountMatches === true,
  ).length;

  return {
    bridge: {
      platformCapturedPaymentsGross,
      lessTimingInTransitGross,
      lessDuplicatePlatformGross,
      expectedOctoberBankPaymentsGross,
      bankOctoberPaymentsGross,
      paymentGrossDifference,
      platformExpectedFees: milliToPaise(platformExpectedFeesMilli),
      bankFees: milliToPaise(bankFeesMilli),
      feeRoundingDifference: milliToPaise(feeRoundingDifferenceMilli),
      platformExpectedNet: milliToPaise(platformExpectedNetMilli),
      bankNet: milliToPaise(bankNetMilli),
      netDifference: milliToPaise(netDifferenceMilli),
      platformRefunds,
      bankRefunds,
      refundsMatchedButOrphaned,
    },
    bridgeMilli: {
      platformExpectedFeesMilli,
      bankFeesMilli,
      feeRoundingDifferenceMilli,
      platformExpectedNetMilli,
      bankNetMilli,
      netDifferenceMilli,
    },
  };
}

/**
 * Control total: the aggregate fee difference must be within controlToleranceMilli (0 here).
 * Conservatively, a non-zero payment gross difference also fails the control.
 */
export function computeControlTotals(
  outcomes: PlatformOutcome[],
  bridge: Bridge,
  bridgeMilli: BridgeMilli,
  config: ReconcileConfig,
): ControlTotals {
  const rowsWithinTolerance = outcomes.filter(
    (o) => o.classification === Classification.MATCHED_ROUNDING_WITHIN_TOLERANCE,
  ).length;
  const feeOk = withinTolerance(bridgeMilli.feeRoundingDifferenceMilli, config.controlToleranceMilli);
  const grossOk = bridge.paymentGrossDifference === 0;
  return {
    rowToleranceMilli: config.rowToleranceMilli,
    controlToleranceMilli: config.controlToleranceMilli,
    rowsWithinTolerance,
    aggregateFeeDiffMilli: bridgeMilli.feeRoundingDifferenceMilli,
    controlTotalStatus: feeOk && grossOk ? 'PASS' : 'FAIL',
  };
}
