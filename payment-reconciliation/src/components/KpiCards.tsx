import { formatINR } from '../domain/money';
import type { ReconcileResult } from '../domain/types';

interface Props {
  result: ReconcileResult;
  exceptionsCount: number;
}

export function KpiCards({ result, exceptionsCount }: Props) {
  const b = result.bridge;
  const cards = [
    { label: 'Platform captured gross', value: formatINR(b.platformCapturedPaymentsGross), hint: 'All captured payment rows' },
    { label: 'Bank October gross', value: formatINR(b.bankOctoberPaymentsGross), hint: 'October payment settlements' },
    {
      label: 'Difference',
      value: formatINR(b.paymentGrossDifference),
      hint: 'Expected bank − bank, after reconciling items',
      tone: b.paymentGrossDifference === 0 ? 'text-emerald-700' : 'text-red-700',
    },
    {
      label: 'Exceptions',
      value: String(exceptionsCount),
      hint: 'Non-clean records to review',
      tone: exceptionsCount === 0 ? 'text-emerald-700' : 'text-amber-700',
    },
  ];
  return (
    <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="kpi-card">
          <p className="text-sm text-slate-500">{c.label}</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${c.tone ?? 'text-slate-900'}`}>{c.value}</p>
          <p className="mt-1 text-xs text-slate-400">{c.hint}</p>
        </div>
      ))}
    </section>
  );
}
