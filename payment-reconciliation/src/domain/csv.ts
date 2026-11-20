import type { BankRow, EventType, PlatformRow } from './types';

export interface CsvTable {
  header: string[];
  records: Record<string, string>[];
}

/**
 * Minimal CSV parser. The inputs have no quoted fields or escaped commas, so a
 * plain split is sufficient. Blank lines are ignored; CRLF is tolerated.
 */
export function parseCsv(text: string): CsvTable {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return { header: [], records: [] };
  const header = lines[0].split(',').map((h) => h.trim());
  const records = lines.slice(1).map((line, i) => {
    const cells = line.split(',');
    if (cells.length !== header.length) {
      throw new Error(`CSV line ${i + 2}: expected ${header.length} fields, got ${cells.length}`);
    }
    const rec: Record<string, string> = {};
    header.forEach((h, j) => {
      rec[h] = cells[j].trim();
    });
    return rec;
  });
  return { header, records };
}

/** Strict integer parse: rejects decimals, blanks, and unsafe integers. */
export function parseInteger(value: string, field = 'value'): number {
  if (!/^-?\d+$/.test(value)) throw new Error(`${field}: "${value}" is not an integer`);
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw new Error(`${field}: "${value}" is out of safe integer range`);
  return n;
}

function parseEventType(value: string): EventType {
  if (value === 'PAYMENT' || value === 'REFUND') return value;
  throw new Error(`event_type: unknown value "${value}"`);
}

function requireColumns(header: string[], cols: string[]): void {
  const missing = cols.filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`CSV missing columns: ${missing.join(', ')}`);
}

export function parsePlatformCsv(text: string): PlatformRow[] {
  const { header, records } = parseCsv(text);
  requireColumns(header, ['row_id', 'txn_id', 'event_type', 'status', 'amount_minor', 'original_txn_id', 'created_at_utc']);
  return records.map((r) => ({
    row_id: r.row_id,
    txn_id: r.txn_id,
    event_type: parseEventType(r.event_type),
    status: r.status,
    amount_minor: parseInteger(r.amount_minor, `${r.row_id}.amount_minor`),
    original_txn_id: r.original_txn_id === '' ? null : r.original_txn_id,
    created_at_utc: r.created_at_utc,
  }));
}

export function parseBankCsv(text: string): BankRow[] {
  const { header, records } = parseCsv(text);
  requireColumns(header, ['settlement_id', 'txn_id', 'event_type', 'batch_id', 'value_date', 'gross_minor', 'fee_minor', 'net_minor']);
  return records.map((r) => ({
    settlement_id: r.settlement_id,
    txn_id: r.txn_id,
    event_type: parseEventType(r.event_type),
    batch_id: r.batch_id,
    value_date: r.value_date,
    gross_minor: parseInteger(r.gross_minor, `${r.settlement_id}.gross_minor`),
    fee_minor: parseInteger(r.fee_minor, `${r.settlement_id}.fee_minor`),
    net_minor: parseInteger(r.net_minor, `${r.settlement_id}.net_minor`),
  }));
}
