import { describe, expect, it } from 'vitest';
import expected from '../fixtures/expected_outcomes.json';
import { computeBridge, computeControlTotals } from '../domain/bridge';
import { loadOctoberReconciliation } from '../fixtures/load';

describe('bridge arithmetic on the full fixture', () => {
  const { input, result } = loadOctoberReconciliation();
  const { bridge, bridgeMilli } = computeBridge(result.platformOutcomes, input.bankRowsOct, input.config.feeRateBps);

  it('produces the values in expected_outcomes.json', () => {
    expect(bridge).toEqual(expected.bridge);
  });

  it('is internally consistent', () => {
    expect(bridge.expectedOctoberBankPaymentsGross).toBe(
      bridge.platformCapturedPaymentsGross - bridge.lessTimingInTransitGross - bridge.lessDuplicatePlatformGross,
    );
    expect(bridge.paymentGrossDifference).toBe(0);
    // Exact milli-paise identities.
    expect(bridgeMilli.platformExpectedFeesMilli).toBe(4401750);
    expect(bridgeMilli.bankFeesMilli).toBe(4400000);
    expect(bridgeMilli.feeRoundingDifferenceMilli).toBe(1750);
    expect(bridgeMilli.platformExpectedNetMilli).toBe(176070 * 1000 - 4401750);
    expect(bridgeMilli.netDifferenceMilli).toBe(1750);
    // netDifference is bank − platform while feeRoundingDifference is platform − bank:
    // the same 1750 milli-paise viewed from opposite sides.
    const netDiffPlatformMinusBank = bridgeMilli.platformExpectedNetMilli - bridgeMilli.bankNetMilli;
    expect(netDiffPlatformMinusBank).toBe(-bridgeMilli.feeRoundingDifferenceMilli);
  });

  it('control total fails with a 1750 milli-paise aggregate fee difference', () => {
    const ct = computeControlTotals(result.platformOutcomes, bridge, bridgeMilli, input.config);
    expect(ct.aggregateFeeDiffMilli).toBe(1750);
    expect(ct.controlTotalStatus).toBe('FAIL');
  });

  it('control total passes when the aggregate is within tolerance', () => {
    const ct = computeControlTotals(result.platformOutcomes, bridge, bridgeMilli, { ...input.config, controlToleranceMilli: 1750 });
    expect(ct.controlTotalStatus).toBe('PASS');
  });
});
