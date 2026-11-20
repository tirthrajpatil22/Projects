# October 2026 Payment Reconciliation

Reconciles a payment platform's October 2026 transaction records against bank settlement records,
using the November settlement file only to verify timing items. React + TypeScript + Vite + Tailwind CSS v4,
tested with Vitest and Testing Library (jsdom). No runtime dependencies beyond React.

## Setup

```bash
npm install
```

```bash
npm run dev        # dashboard at http://localhost:5173/
```

```bash
npm run test       # vitest run
```

```bash
npm run typecheck  # tsc --noEmit (app + node configs)
```

```bash
npm run build      # tsc -b && vite build
```

## Layout

| Path | Purpose |
| --- | --- |
| `src/fixtures/*.csv`, `expected_outcomes.json` | Input data and the acceptance oracle (unchanged from the spec) |
| `src/fixtures/load.ts` | Loads fixtures via `?raw` imports, parses, and runs `reconcile` |
| `src/domain/csv.ts` | Hand-written CSV parser (no quoting support needed) with strict integer parsing |
| `src/domain/money.ts` | Integer paise / milli-paise helpers, tolerance constants, INR formatting |
| `src/domain/reconcile.ts` | Pure reconciliation engine |
| `src/domain/bridge.ts` | Pure bridge and control-total calculations |
| `src/components/*` | Dashboard UI |
| `src/__tests__/*` | Unit, integration (`fixtures.test.ts`) and component tests |

## Reconciliation rules

1. **Duplicates.** Platform rows sharing a `txn_id` are ordered by `created_at_utc`, then `row_id`. The first is the primary; the rest are `DUPLICATE_PLATFORM_ENTRY` and are excluded from matching. Bank rows get the same check.
2. **Payments.** Each primary payment is matched to the October bank `PAYMENT` with the same `txn_id`. Gross must match exactly, or it is `AMOUNT_MISMATCH`. The expected fee is 2.5% (250 bps) computed exactly in milli-paise (`amount × 25`). A zero fee difference is `MATCHED`. A difference of up to ±500 milli-paise (half a paisa) is `MATCHED_ROUNDING_WITHIN_TOLERANCE`. Anything larger is `AMOUNT_MISMATCH`.
3. **Timing.** A payment with no October settlement is `TIMING_IN_TRANSIT` if a November settlement has the same `txn_id` and gross within 3 days of the capture's UTC date. Otherwise it is `MISSING_SETTLEMENT`.
4. **Orphan bank rows.** October bank rows with no platform counterpart are `ORPHAN_BANK_SETTLEMENT`. November rows are never orphans.
5. **Refunds.** A refund is matched to the October bank `REFUND` by refund ID. Its `original_txn_id` must be an October primary payment or appear in `priorPeriodPaymentTxnIds`. If not, it is `ORPHAN_REFUND`, even when the bank amount agrees.
6. **Bridge and control total.** Platform captured gross, less timing items, less duplicates, gives expected bank gross, which must equal bank October gross. The aggregate fee difference must be within 0 milli-paise. Here it is 1750 milli-paise (1.75 paise), so the control total is **FAIL**, even though all six rounding rows are individually within tolerance.

All money is handled as integers (paise or milli-paise). Decimal paise appear only in bridge output and display.

## Tests

`fixtures.test.ts` is the primary acceptance test. It checks every row's classification, `bankRef`, `lagDays` and `feeDiffMilli`, plus the classification counts, every bridge value and the control totals, against `expected_outcomes.json`. Current totals: **6 test files, 52 tests, all passing.**

## Interpretation choices and deviations

Where the spec was ambiguous, the more conservative option was chosen:

- **`platformCapturedPaymentsGross` includes the duplicate row.** The spec says "primary PAYMENT rows", but the expected value (346,070) only reconciles if the duplicate P-011 is included. That is also the only reading under which "less: duplicate" is a meaningful bridge line. The expected-outcomes file was treated as authoritative.
- **Sign of `netDifference`.** It is computed as `bankNet − platformExpectedNet` (+1.75), as the spec defines it and the JSON expects. `feeRoundingDifference` is `expected − bank` (+1.75). They are the same 1750 milli-paise seen from opposite sides; `bridge.test.ts` asserts that `platformNet − bankNet = −feeRoundingDifference`.
- **`feeDiffMilli` is signed as expected − bank.** This matches the JSON's positive values. Tolerance checks use the absolute value.
- **Fee decimals.** Fee lines are exact. They show two decimals, or three if the thousandths digit is non-zero, and are never rounded.
- **Refund precedence.** A failed original-transaction check (`ORPHAN_REFUND`) takes priority over a missing or mismatched bank refund. The reason text still records the bank-side result.
- **Extra conservative checks** (none trigger on the fixtures):
  - A matched bank row whose `gross − fee ≠ net` is classed `AMOUNT_MISMATCH`.
  - The control total also fails if the payment gross difference is non-zero.
  - Unmatched October bank `REFUND` rows are also flagged `ORPHAN_BANK_SETTLEMENT`.
  - Bank-side duplicates get a separate `DUPLICATE_BANK_ENTRY` classification. It is not in the spec's list and is always 0 here.
  - `feeMilli` throws instead of rounding if a rate produces fractional milli-paise.
  - Every bank `PAYMENT` row, including any bank duplicate, counts toward `bankOctoberPaymentsGross`, so a bank duplicate shows up as a bridge difference.
- **The 501 milli-paise unit test uses a 1 bps fee rate.** At 250 bps every expected fee is a multiple of 25 milli-paise, so a 501 difference can't be built from real amounts.
- **Additions outside the listed structure:**
  - `src/fixtures/load.ts`: the shared fixture loader.
  - `src/components/records.ts` and `ClassificationBadge.tsx`: shared UI helpers.
  - `src/test-setup.ts`: jest-dom matchers and cleanup.
  - The verification panel and rules panel live inside `Dashboard.tsx`.
  - The full platform list reuses `ExceptionsTable`.
- **Dev-only test helpers:** `@testing-library/jest-dom` was added as a dev dependency. There are no extra runtime dependencies.
