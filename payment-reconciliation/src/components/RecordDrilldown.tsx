import { useEffect } from 'react';
import { formatINR, milliToPaiseString } from '../domain/money';
import type { BankRow, PlatformRow, ReconcileResult } from '../domain/types';
import { ClassificationBadge } from './ClassificationBadge';
import type { RecordItem } from './records';

interface Props {
  item: RecordItem;
  result: ReconcileResult;
  onClose: () => void;
}

function Field({ label, value, mono, money }: { label: string; value: string; mono?: boolean; money?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-t border-slate-100 py-1.5 text-sm first:border-t-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${mono ? 'font-mono text-xs' : ''} ${money ? 'tabular-nums' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function PlatformCard({ row }: { row: PlatformRow | null }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Platform record</h3>
      {row ? (
        <dl>
          <Field label="Row ID" value={row.row_id} mono />
          <Field label="Txn ID" value={row.txn_id} mono />
          <Field label="Event / status" value={`${row.event_type} / ${row.status}`} />
          <Field label="Amount" value={`${formatINR(row.amount_minor)} (${row.amount_minor} paise)`} money />
          <Field label="Original txn" value={row.original_txn_id ?? ''} mono />
          <Field label="Created (UTC)" value={row.created_at_utc} mono />
        </dl>
      ) : (
        <p className="text-sm text-slate-400">No platform record.</p>
      )}
    </div>
  );
}

function BankCard({ row, period }: { row: BankRow | null; period: 'OCT' | 'NOV' | null }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Bank settlement {period === 'NOV' ? '(November file)' : period === 'OCT' ? '(October file)' : ''}
      </h3>
      {row ? (
        <dl>
          <Field label="Settlement ID" value={row.settlement_id} mono />
          <Field label="Txn ID" value={row.txn_id} mono />
          <Field label="Event / batch" value={`${row.event_type} / ${row.batch_id}`} />
          <Field label="Value date" value={row.value_date} mono />
          <Field label="Gross" value={`${formatINR(row.gross_minor)} (${row.gross_minor} paise)`} money />
          <Field label="Fee" value={`${row.fee_minor} paise`} money />
          <Field label="Net" value={`${formatINR(row.net_minor)} (${row.net_minor} paise)`} money />
        </dl>
      ) : (
        <p className="text-sm text-slate-400">No matched bank settlement.</p>
      )}
    </div>
  );
}

export function RecordDrilldown({ item, result, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = item.platform;
  const platformRow = p?.row ?? null;
  const bankRow = p ? p.bankRow : (item.bank?.row ?? null);
  const period = p ? p.bankPeriod : (item.bank?.period ?? null);
  const fee = p?.fee;
  const tol = result.config.rowToleranceMilli;

  return (
    <div className="fixed inset-0 z-20 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drilldown-title">
      <button type="button" aria-label="Close drill-down" className="absolute inset-0 bg-slate-900/20" onClick={onClose} />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-xl" data-testid="record-drilldown">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="drilldown-title" className="text-lg font-semibold text-slate-900">
              <span className="font-mono">{item.id}</span> · {item.txnId}
            </h2>
            <div className="mt-1"><ClassificationBadge classification={item.classification} /></div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50">
            Close
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-700">{item.reason}</p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <PlatformCard row={platformRow} />
          <BankCard row={bankRow} period={period} />
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 p-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Fee comparison (milli-paise)</h3>
          {fee ? (
            <dl>
              <Field label={`Expected fee (${result.config.feeRateBps} bps)`} value={`${fee.expectedFeeMilli} (${milliToPaiseString(fee.expectedFeeMilli)} paise)`} money />
              <Field label="Bank fee" value={`${fee.bankFeeMilli} (${milliToPaiseString(fee.bankFeeMilli)} paise)`} money />
              <Field label="Difference (expected − bank)" value={`${fee.feeDiffMilli}`} money />
              <Field label="Row tolerance" value={`±${tol}`} money />
              <div className="flex justify-between gap-3 border-t border-slate-100 py-1.5 text-sm">
                <dt className="text-slate-500">Tolerance result</dt>
                <dd className={`font-semibold ${fee.withinRowTolerance ? 'text-emerald-700' : 'text-red-700'}`} data-testid="tolerance-result">
                  {fee.withinRowTolerance ? `Within tolerance (|${fee.feeDiffMilli}| ≤ ${tol})` : `Exceeds tolerance (|${fee.feeDiffMilli}| > ${tol})`}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">
              {p?.classification === 'TIMING_IN_TRANSIT'
                ? 'Not compared: settles in November, outside this period. Gross and lag verified instead.'
                : 'No fee comparison applies to this record.'}
            </p>
          )}
          {p?.lagDays !== undefined && (
            <p className="mt-2 text-sm text-slate-700">
              Lag: <span className="tabular-nums font-semibold">{p.lagDays} days</span> (window {result.config.settlementLagWindowDays} days)
            </p>
          )}
          {p?.duplicateOf && (
            <p className="mt-2 text-sm text-slate-700">Primary record: <span className="font-mono">{p.duplicateOf}</span></p>
          )}
        </div>
      </aside>
    </div>
  );
}
