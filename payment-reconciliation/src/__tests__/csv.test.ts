import { describe, expect, it } from 'vitest';
import { parseBankCsv, parseCsv, parseInteger, parsePlatformCsv } from '../domain/csv';

const PLATFORM = `row_id,txn_id,event_type,status,amount_minor,original_txn_id,created_at_utc
P-001,T001,PAYMENT,CAPTURED,40000,,2026-10-05 10:00:00
P-012,R-0401,REFUND,COMPLETED,30000,T-0999,2026-10-28 11:00:00
`;

describe('parseCsv', () => {
  it('parses the header row', () => {
    const t = parseCsv(PLATFORM);
    expect(t.header).toEqual(['row_id', 'txn_id', 'event_type', 'status', 'amount_minor', 'original_txn_id', 'created_at_utc']);
    expect(t.records).toHaveLength(2);
  });

  it('keeps empty fields as empty strings and ignores blank lines / CRLF', () => {
    const t = parseCsv('a,b,c\r\n1,,3\r\n\r\n');
    expect(t.records).toEqual([{ a: '1', b: '', c: '3' }]);
  });

  it('rejects rows with the wrong number of fields', () => {
    expect(() => parseCsv('a,b\n1,2,3')).toThrow(/expected 2 fields/);
  });
});

describe('typed parsers', () => {
  it('maps an empty original_txn_id on payment rows to null', () => {
    const rows = parsePlatformCsv(PLATFORM);
    expect(rows[0].original_txn_id).toBeNull();
    expect(rows[1].original_txn_id).toBe('T-0999');
  });

  it('parses numeric fields as integers', () => {
    const [p] = parsePlatformCsv(PLATFORM);
    expect(p.amount_minor).toBe(40000);
    expect(Number.isInteger(p.amount_minor)).toBe(true);
    const [b] = parseBankCsv(
      'settlement_id,txn_id,event_type,batch_id,value_date,gross_minor,fee_minor,net_minor\nS-004,T004,PAYMENT,B-OCT-02,2026-10-21,1003,25,978',
    );
    expect([b.gross_minor, b.fee_minor, b.net_minor]).toEqual([1003, 25, 978]);
    expect([b.gross_minor, b.fee_minor, b.net_minor].every(Number.isInteger)).toBe(true);
  });

  it('rejects non-integer money values', () => {
    expect(() => parseInteger('10.5')).toThrow();
    expect(() => parseInteger('')).toThrow();
    expect(parseInteger('-25')).toBe(-25);
  });
});
