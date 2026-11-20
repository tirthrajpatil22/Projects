import { formatINR } from '../domain/money';
import { ALL_CLASSIFICATIONS, Classification, type ReconcileResult } from '../domain/types';
import { ClassificationBadge } from './ClassificationBadge';
import { CLASSIFICATION_TONE, TONE_BAR } from './records';

const TONE_ROW = { green: 'bg-emerald-50/40', amber: 'bg-amber-50/40', red: 'bg-red-50/40' } as const;

export function ClassificationSummary({ result }: { result: ReconcileResult }) {
  const rows = ALL_CLASSIFICATIONS.filter(
    (c) => c !== Classification.DUPLICATE_BANK_ENTRY || result.classificationCounts[c] > 0,
  ).map((c) => {
    const platformGross = result.platformOutcomes
      .filter((o) => o.classification === c)
      .reduce((s, o) => s + o.row.amount_minor, 0);
    const bankGross = result.bankOutcomes
      .filter((b) => b.classification === c)
      .reduce((s, b) => s + b.row.gross_minor, 0);
    return { c, count: result.classificationCounts[c], gross: platformGross + bankGross };
  });
  const maxCount = Math.max(...rows.map((r) => r.count), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm" aria-labelledby="summary-title">
      <header className="border-b border-slate-200 px-5 py-3">
        <h2 id="summary-title" className="font-semibold text-slate-900">Classification summary</h2>
        <p className="text-sm text-slate-500">Every platform row counted once; bank-only rows shown separately</p>
      </header>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-2 font-medium">Classification</th>
            <th className="hidden px-2 py-2 sm:table-cell" aria-hidden />
            <th className="px-3 py-2 text-right font-medium">Count</th>
            <th className="px-5 py-2 text-right font-medium">Gross</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, count, gross }) => {
            const tone = CLASSIFICATION_TONE[c];
            return (
              <tr key={c} className={`border-t border-slate-100 ${count ? TONE_ROW[tone] : 'text-slate-400'}`} data-testid={`summary-${c}`}>
                <td className="px-5 py-2"><ClassificationBadge classification={c} /></td>
                <td className="hidden w-1/4 px-2 py-2 sm:table-cell">
                  <div className="h-2 rounded bg-slate-100">
                    <div className={`h-2 rounded ${TONE_BAR[tone]}`} style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{count}</td>
                <td className="px-5 py-2 text-right tabular-nums">{formatINR(gross)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </section>
  );
}
