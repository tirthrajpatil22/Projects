import { formatFeeDiff, formatINR, formatMilliAsPaise } from '../domain/money';
import type { ReconcileResult } from '../domain/types';

interface Line {
  label: string;
  amountMinor: number;
  kind: 'start' | 'less' | 'subtotal' | 'bank' | 'diff';
  testId?: string;
}

export function BridgePanel({ result }: { result: ReconcileResult }) {
  const b = result.bridge;
  const m = result.bridgeMilli;
  const ct = result.controlTotals;
  const max = Math.max(b.platformCapturedPaymentsGross, b.bankOctoberPaymentsGross, 1);

  const lines: Line[] = [
    { label: 'Platform captured payments', amountMinor: b.platformCapturedPaymentsGross, kind: 'start' },
    { label: 'Less: timing in transit (Nov verification)', amountMinor: -b.lessTimingInTransitGross, kind: 'less' },
    { label: 'Less: duplicate platform entry', amountMinor: -b.lessDuplicatePlatformGross, kind: 'less' },
    { label: '= Expected bank payments', amountMinor: b.expectedOctoberBankPaymentsGross, kind: 'subtotal' },
    { label: 'Bank October payments', amountMinor: b.bankOctoberPaymentsGross, kind: 'bank' },
    { label: 'Difference', amountMinor: b.paymentGrossDifference, kind: 'diff', testId: 'bridge-difference' },
  ];

  const barColour: Record<Line['kind'], string> = {
    start: 'bg-slate-400',
    less: 'bg-amber-400',
    subtotal: 'bg-slate-600',
    bank: 'bg-sky-500',
    diff: b.paymentGrossDifference === 0 ? 'bg-emerald-500' : 'bg-red-500',
  };

  const feeOk = ct.controlTotalStatus === 'PASS';

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="bridge-panel" aria-labelledby="bridge-title">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 id="bridge-title" className="font-semibold text-slate-900">Payment bridge</h2>
        <p className="text-sm text-slate-500">Platform captures to October bank receipts</p>
      </header>
      <table className="w-full text-sm">
        <tbody>
          {lines.map((l) => (
            <tr
              key={l.label}
              data-testid={l.testId}
              className={
                l.kind === 'subtotal' || l.kind === 'diff'
                  ? 'border-t border-slate-300 font-semibold'
                  : 'border-t border-slate-100'
              }
            >
              <td className={`px-5 py-2 ${l.kind === 'less' ? 'pl-9 text-slate-600' : 'text-slate-800'}`}>{l.label}</td>
              <td className="hidden w-1/3 px-2 py-2 sm:table-cell">
                <div className="h-2 rounded bg-slate-100">
                  <div
                    className={`h-2 rounded ${barColour[l.kind]}`}
                    style={{ width: `${(Math.abs(l.amountMinor) / max) * 100}%` }}
                  />
                </div>
              </td>
              <td
                className={`px-5 py-2 text-right tabular-nums ${
                  l.kind === 'diff' ? (l.amountMinor === 0 ? 'text-emerald-700' : 'text-red-700') : ''
                }`}
              >
                {l.kind === 'less' ? `(${formatINR(-l.amountMinor)})` : formatINR(l.amountMinor)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Fees (2.5% contract rate)</h3>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-600">Platform expected fees</dt>
          <dd className="text-right tabular-nums">{formatMilliAsPaise(m.platformExpectedFeesMilli)}</dd>
          <dt className="text-slate-600">Bank fees</dt>
          <dd className="text-right tabular-nums">{formatMilliAsPaise(m.bankFeesMilli)}</dd>
          <dt className="font-semibold text-slate-800">Rounding difference (expected − bank)</dt>
          <dd
            className={`text-right font-semibold tabular-nums ${feeOk ? 'text-emerald-700' : 'text-red-700'}`}
            data-testid="aggregate-fee-diff"
          >
            {formatFeeDiff(m.feeRoundingDifferenceMilli)}
          </dd>
          <dt className="text-slate-600">Platform expected net</dt>
          <dd className="text-right tabular-nums">{formatMilliAsPaise(m.platformExpectedNetMilli)}</dd>
          <dt className="text-slate-600">Bank net</dt>
          <dd className="text-right tabular-nums">{formatMilliAsPaise(m.bankNetMilli)}</dd>
          <dt className="text-slate-600">Net difference (bank − expected)</dt>
          <dd className="text-right tabular-nums">{formatFeeDiff(m.netDifferenceMilli)}</dd>
        </dl>
        <p className="mt-2 text-xs text-slate-500">
          Control tolerance {ct.controlToleranceMilli} milli-paise on the aggregate →{' '}
          <span className={feeOk ? 'font-semibold text-emerald-700' : 'font-semibold text-red-700'}>
            {ct.controlTotalStatus}
          </span>
          . {ct.rowsWithinTolerance} rows are individually within ±{ct.rowToleranceMilli} milli-paise.
        </p>
      </div>

      <div className="border-t border-slate-200 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Refunds (outflows)</h3>
        <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-600">Platform refunds</dt>
          <dd className="text-right tabular-nums">({formatINR(b.platformRefunds)})</dd>
          <dt className="text-slate-600">Bank refunds</dt>
          <dd className="text-right tabular-nums">({formatINR(b.bankRefunds)})</dd>
          <dt className="text-slate-600">Matched to bank but orphaned</dt>
          <dd className={`text-right tabular-nums ${b.refundsMatchedButOrphaned ? 'text-red-700 font-semibold' : ''}`}>
            {b.refundsMatchedButOrphaned}
          </dd>
        </dl>
      </div>
    </section>
  );
}
