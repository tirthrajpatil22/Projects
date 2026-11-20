import platformCsv from './platform_transactions_2026_10.csv?raw';
import bankOctCsv from './bank_settlements_2026_10.csv?raw';
import bankNovCsv from './bank_settlements_2026_11.csv?raw';
import { parseBankCsv, parsePlatformCsv } from '../domain/csv';
import { DEFAULT_CONFIG, reconcile } from '../domain/reconcile';
import type { ReconcileInput, ReconcileResult } from '../domain/types';

export const FIXTURE_FILES = {
  platform: 'platform_transactions_2026_10.csv',
  bankOct: 'bank_settlements_2026_10.csv',
  bankNov: 'bank_settlements_2026_11.csv',
} as const;

export function loadOctoberInput(): ReconcileInput {
  return {
    platformRows: parsePlatformCsv(platformCsv),
    bankRowsOct: parseBankCsv(bankOctCsv),
    bankRowsNov: parseBankCsv(bankNovCsv),
    priorPeriodPaymentTxnIds: [],
    config: { ...DEFAULT_CONFIG },
  };
}

export function loadOctoberReconciliation(): { input: ReconcileInput; result: ReconcileResult } {
  const input = loadOctoberInput();
  return { input, result: reconcile(input) };
}
