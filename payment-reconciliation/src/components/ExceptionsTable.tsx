import { useId, useMemo, useState } from 'react';
import { formatINR } from '../domain/money';
import type { Classification } from '../domain/types';
import { ClassificationBadge } from './ClassificationBadge';
import { CLASSIFICATION_LABEL, type RecordItem } from './records';

interface Props {
  title: string;
  subtitle?: string;
  items: RecordItem[];
  selectedId: string | null;
  onSelect: (item: RecordItem) => void;
  filterable?: boolean;
  testId?: string;
}

/** Record table with an optional classification filter. Used for exceptions and the full platform list. */
export function ExceptionsTable({ title, subtitle, items, selectedId, onSelect, filterable = true, testId = 'exceptions-table' }: Props) {
  const [filter, setFilter] = useState<'ALL' | Classification>('ALL');
  const selectId = useId();
  const present = useMemo(() => [...new Set(items.map((i) => i.classification))], [items]);
  const shown = filter === 'ALL' ? items : items.filter((i) => i.classification === filter);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" data-testid={testId} aria-label={title}>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {filterable && (
          <div className="flex min-w-0 max-w-full items-center gap-2 text-sm">
            <label htmlFor={selectId} className="text-slate-600">Classification</label>
            <select
              id={selectId}
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'ALL' | Classification)}
              className="min-w-0 max-w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            >
              <option value="ALL">All ({items.length})</option>
              {present.map((c) => (
                <option key={c} value={c}>
                  {CLASSIFICATION_LABEL[c]} ({items.filter((i) => i.classification === c).length})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-2 font-medium">Row ID</th>
              <th className="whitespace-nowrap px-4 py-2 font-medium">Txn ID</th>
              <th className="px-4 py-2 font-medium">Event</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Classification</th>
              <th className="px-4 py-2 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => (
              <tr
                key={i.id}
                data-testid={`${testId}-row`}
                tabIndex={0}
                aria-selected={selectedId === i.id}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(i);
                  }
                }}
                className={`cursor-pointer border-t border-slate-100 align-top hover:bg-slate-50 focus:bg-slate-50 focus:outline-none ${
                  selectedId === i.id ? 'bg-sky-50' : ''
                }`}
              >
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-800">{i.id}</td>
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-600">{i.txnId}</td>
                <td className="px-4 py-2 text-slate-600">{i.eventType}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatINR(i.amountMinor)}</td>
                <td className="px-4 py-2"><ClassificationBadge classification={i.classification} /></td>
                <td className="min-w-64 px-4 py-2 text-slate-600">{i.reason}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No records.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
