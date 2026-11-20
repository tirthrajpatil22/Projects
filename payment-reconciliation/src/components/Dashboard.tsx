import { useCallback, useMemo, useState } from 'react';
import type { ReconcileInput, ReconcileResult } from '../domain/types';
import { BridgePanel } from './BridgePanel';
import { ClassificationSummary } from './ClassificationSummary';
import { ExceptionsTable } from './ExceptionsTable';
import { KpiCards } from './KpiCards';
import { RecordDrilldown } from './RecordDrilldown';
import { exceptionItems, platformItem, type RecordItem } from './records';

export interface DashboardProps {
  input: ReconcileInput;
  result: ReconcileResult;
  files: { platform: string; bankOct: string; bankNov: string };
}

function VerificationPanel({ result }: { result: ReconcileResult }) {
  const timing = result.platformOutcomes.filter((o) => o.classification === 'TIMING_IN_TRANSIT');
  const window = result.config.settlementLagWindowDays;
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="verification-panel" aria-labelledby="verify-title">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 id="verify-title" className="font-semibold text-slate-900">November verification</h2>
        <p className="text-sm text-slate-500">Settlements from the next period used only to confirm timing items</p>
      </header>
      <ul className="divide-y divide-slate-100">
        {timing.length === 0 && <li className="px-5 py-3 text-sm text-slate-400">No timing items.</li>}
        {timing.map((o) => (
          <li key={o.rowId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
            <span>
              <span className="font-mono font-semibold">{o.bankRef}</span> clears{' '}
              <span className="font-mono font-semibold">{o.rowId}</span> ({o.row.txn_id}): captured{' '}
              {o.row.created_at_utc.slice(0, 10)}, value date {o.bankRow?.value_date}
            </span>
            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20 tabular-nums">
              {o.lagDays}-day lag · inside {window}-day window
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RulesPanel({ result }: { result: ReconcileResult }) {
  const c = result.config;
  return (
    <details className="rounded-xl border border-slate-200 bg-white shadow-sm open:pb-3">
      <summary className="cursor-pointer select-none px-5 py-3 font-semibold text-slate-900">Reconciliation rules</summary>
      <ol className="list-decimal space-y-1.5 px-10 text-sm text-slate-700">
        <li><b>Duplicates.</b> Platform rows sharing a txn_id are ordered by creation time then row ID; the first is kept, later ones are duplicates and excluded from matching and totals.</li>
        <li><b>Payments.</b> Each payment is matched to the October bank payment with the same txn_id. Gross must match exactly. The expected fee is {c.feeRateBps / 100}% computed in milli-paise; a zero difference is Matched, up to ±{c.rowToleranceMilli} milli-paise (half a paisa) is Matched – rounding, beyond that is an Amount mismatch.</li>
        <li><b>Timing.</b> A payment with no October settlement is In transit if a November settlement has the same txn_id and gross within {c.settlementLagWindowDays} days of capture; otherwise it is a Missing settlement.</li>
        <li><b>Orphan bank rows.</b> October bank rows with no platform counterpart are Orphan bank settlements. November rows are only used for verification.</li>
        <li><b>Refunds.</b> Matched to the October bank refund by refund ID. The original payment must exist in October or in prior periods, otherwise the refund is an Orphan refund even when the bank agrees.</li>
        <li><b>Control total.</b> The aggregate fee difference must be within {c.controlToleranceMilli} milli-paise, and the payment gross difference must be zero, for the period to PASS.</li>
      </ol>
    </details>
  );
}

export function Dashboard({ input, result, files }: DashboardProps) {
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const close = useCallback(() => setSelected(null), []);
  const exceptions = useMemo(() => exceptionItems(result), [result]);
  const allPlatform = useMemo(() => result.platformOutcomes.map(platformItem), [result]);
  const status = result.controlTotals.controlTotalStatus;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">October 2026 Reconciliation</h1>
            <p className="mt-1 text-sm text-slate-500">
              {input.platformRows.length} platform rows · {input.bankRowsOct.length} October bank rows ·{' '}
              {input.bankRowsNov.length} November bank row{input.bankRowsNov.length === 1 ? '' : 's'} from{' '}
              <span className="font-mono text-xs">{files.bankNov}</span> used for verification
            </p>
          </div>
          <span
            data-testid="control-status-badge"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${
              status === 'PASS' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/30' : 'bg-red-50 text-red-700 ring-red-600/30'
            }`}
          >
            <span className="text-xs font-medium uppercase tracking-wide opacity-75">Control total</span>
            <span>{status}</span>
          </span>
        </header>

        <KpiCards result={result} exceptionsCount={exceptions.length} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BridgePanel result={result} />
          <div className="min-w-0 space-y-6">
            <ClassificationSummary result={result} />
            <VerificationPanel result={result} />
          </div>
        </div>

        <ExceptionsTable
          title="Exceptions"
          subtitle="Everything that is not a clean match. Click a row for details."
          items={exceptions}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          testId="exceptions-table"
        />

        <ExceptionsTable
          title="All platform records"
          subtitle={files.platform}
          items={allPlatform}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          testId="platform-table"
        />

        <RulesPanel result={result} />
      </main>

      {selected && <RecordDrilldown item={selected} result={result} onClose={close} />}
    </div>
  );
}
