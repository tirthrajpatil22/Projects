import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Dashboard } from '../components/Dashboard';
import { FIXTURE_FILES, loadOctoberReconciliation } from '../fixtures/load';

function renderDashboard() {
  const { input, result } = loadOctoberReconciliation();
  return render(<Dashboard input={input} result={result} files={FIXTURE_FILES} />);
}

describe('Dashboard', () => {
  it('renders the header', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('October 2026 Reconciliation');
    expect(screen.getByText(/12 platform rows · 10 October bank rows/)).toBeInTheDocument();
  });

  it('bridge shows a ₹0.00 difference', () => {
    renderDashboard();
    const diff = within(screen.getByTestId('bridge-panel')).getByTestId('bridge-difference');
    expect(diff).toHaveTextContent('Difference');
    expect(diff).toHaveTextContent('₹0.00');
  });

  it('control-total badge says FAIL', () => {
    renderDashboard();
    const badge = screen.getByTestId('control-status-badge');
    expect(badge).toHaveTextContent('FAIL');
    expect(badge.className).toMatch(/red/);
  });

  it('exceptions table has 9 rows: 1 timing, 6 rounding, 1 duplicate, 1 orphan refund', () => {
    renderDashboard();
    const rows = within(screen.getByTestId('exceptions-table')).getAllByTestId('exceptions-table-row');
    expect(rows).toHaveLength(9);
    const titles = rows.map((r) => within(r).getByTitle(/^[A-Z_]+$/).getAttribute('title'));
    const count = (c: string) => titles.filter((t) => t === c).length;
    expect(count('TIMING_IN_TRANSIT')).toBe(1);
    expect(count('MATCHED_ROUNDING_WITHIN_TOLERANCE')).toBe(6);
    expect(count('DUPLICATE_PLATFORM_ENTRY')).toBe(1);
    expect(count('ORPHAN_REFUND')).toBe(1);
  });

  it('shows 1.75 paise as the aggregate fee difference for the rounding rows', () => {
    renderDashboard();
    expect(screen.getByTestId('aggregate-fee-diff')).toHaveTextContent('1.75 paise (1750 milli-paise)');
  });

  it('filters the exceptions table by classification', () => {
    renderDashboard();
    const table = screen.getByTestId('exceptions-table');
    fireEvent.change(within(table).getByLabelText('Classification'), {
      target: { value: 'MATCHED_ROUNDING_WITHIN_TOLERANCE' },
    });
    expect(within(table).getAllByTestId('exceptions-table-row')).toHaveLength(6);
  });

  it('opens a drill-down with the fee comparison and tolerance result', () => {
    renderDashboard();
    const row = within(screen.getByTestId('exceptions-table'))
      .getAllByTestId('exceptions-table-row')
      .find((r) => r.textContent?.includes('P-004'))!;
    fireEvent.click(row);
    const panel = screen.getByTestId('record-drilldown');
    expect(panel).toHaveTextContent('S-004');
    expect(panel).toHaveTextContent('25075');
    expect(within(panel).getByTestId('tolerance-result')).toHaveTextContent('Within tolerance (|75| ≤ 500)');
  });

  it('shows the November settlement used to verify the timing item', () => {
    renderDashboard();
    const v = screen.getByTestId('verification-panel');
    expect(v).toHaveTextContent('S-010 clears P-003');
    expect(v).toHaveTextContent('2-day lag · inside 3-day window');
  });
});
