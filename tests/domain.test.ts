import { describe, expect, it } from 'vitest';
import { leadsToCsv, csvCell } from '../src/domain/csv';
import { goingCold, maintenanceDate, nextDate, stageStamps } from '../src/domain/leads';
import { leadsUsing, missingMasters, renamedValue } from '../src/domain/masters';
import { buildReport, periodRange } from '../src/domain/reports';
import type { Lead, Master } from '../src/types';
import { addDays, dayDiff, fmtT, ymd } from '../src/utils/dates';
import { blankLast, digits, splitList, waNumber } from '../src/utils/format';
import { esc } from '../src/utils/dom';

const lead = (p: Partial<Lead>): Lead => ({ id: 'x', name: 'Test', ph: '9876543210', st: 'call', ...p });

describe('dates', () => {
  it('formats local dates without UTC shift', () => {
    expect(ymd(new Date(2026, 10, 27, 1, 30))).toBe('2026-11-27');
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(dayDiff('2026-12-01', '2026-11-30')).toBe(1);
  });
  it('formats 12-hour times', () => {
    expect(fmtT('00:05')).toBe('12:05 am');
    expect(fmtT('16:00')).toBe('4:00 pm');
  });
});

describe('format', () => {
  it('normalises phones', () => {
    expect(digits('+91 98765-43210')).toBe('9876543210');
    expect(waNumber('98765 43210')).toBe('919876543210');
  });
  it('splits multi-software values', () => {
    expect(splitList('Equal + Chandni')).toEqual(['Equal', 'Chandni']);
    expect(splitList('Syspro, Empire')).toEqual(['Syspro', 'Empire']);
    expect(splitList('')).toEqual([]);
  });
  it('sorts blanks last', () => {
    expect(['', 'Pintu', 'Ankit'].sort(blankLast)).toEqual(['Ankit', 'Pintu', '']);
  });
  it('escapes html', () => {
    expect(esc('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
  });
});

describe('leads', () => {
  it('next date is the earlier of demo and follow-up', () => {
    expect(nextDate(lead({ st: 'demo', dd: '2026-12-05', fu: '2026-12-01' }))).toBe('2026-12-01');
    expect(nextDate(lead({ st: 'call', dd: '2026-11-01', fu: null }))).toBeNull();
  });
  it('maintenance: on/before 15th → same month next year, after → next month', () => {
    expect(maintenanceDate(lead({ cd: '2026-03-15' }))?.toDateString()).toBe(new Date(2027, 2, 1).toDateString());
    expect(maintenanceDate(lead({ cd: '2026-03-16' }))?.toDateString()).toBe(new Date(2027, 3, 1).toDateString());
    expect(maintenanceDate(lead({ cd: '2026-12-20' }))?.toDateString()).toBe(new Date(2028, 0, 1).toDateString());
  });
  it('stamps stage timestamps only on change', () => {
    expect(stageStamps('call', 'call')).toEqual({});
    expect(Object.keys(stageStamps('call', 'given'))).toEqual(['givenAt']);
  });
  it('flags leads with no contact in 7+ days and nothing planned', () => {
    const now = Date.now();
    expect(goingCold(lead({ touchedAt: now - 8 * 86400000 }), '2026-11-27', now)).toBe(true);
    expect(goingCold(lead({ touchedAt: now - 8 * 86400000, fu: '2026-12-01' }), '2026-11-27', now)).toBe(false);
  });
});

describe('masters', () => {
  const leads = [
    lead({ id: 'a', accountant: 'Pintu', curSw: 'Equal + Chandni', ref: 'Alpeshbhai', biz: 'Rapier' }),
    lead({ id: 'b', accountant: 'pintu', curSw: 'Equal', ref: 'Alpeshbhai' }),
  ];
  it('finds leads using a name, case-insensitively and inside multi-software', () => {
    expect(leadsUsing(leads, 'acc', 'Pintu').map((l) => l.id)).toEqual(['a', 'b']);
    expect(leadsUsing(leads, 'sw', 'chandni').map((l) => l.id)).toEqual(['a']);
  });
  it('renames inside multi-software values', () => {
    expect(renamedValue(leads[0], 'sw', 'Chandni', 'Chandni ERP')).toBe('Equal + Chandni ERP');
    expect(renamedValue(leads[0], 'sw', 'Chandni', '')).toBe('Equal');
  });
  it('lists missing masters once each', () => {
    const existing: Master[] = [{ t: 'acc', name: 'PINTU' }];
    const missing = missingMasters(leads, existing);
    expect(missing).toContainEqual(['ref', 'Alpeshbhai']);
    expect(missing.filter(([t]) => t === 'acc')).toEqual([]);
    expect(missing.filter(([t]) => t === 'sw').map(([, n]) => n)).toEqual(['Equal', 'Chandni']);
  });
});

describe('reports', () => {
  it('computes win rate and revenue for the period', () => {
    const now = new Date(2026, 10, 27);
    const t = now.getTime() - 86400000;
    const leads = [
      lead({ id: '1', createdAt: t, st: 'closed', cd: '2026-11-20', amt: 50000, src: 'Reference' }),
      lead({ id: '2', createdAt: t, st: 'rejected', lostAt: t, rejectReason: 'Too expensive' }),
      lead({ id: '3', createdAt: t, st: 'call', val: 30000 }),
    ];
    const r = buildReport(leads, 'month', now);
    expect(r.added.length).toBe(3);
    expect(r.revenue).toBe(50000);
    expect(r.winRate).toBe(50);
    expect(r.pipeline).toBe(30000);
    expect(r.reasons).toEqual([{ name: 'Too expensive', count: 1 }]);
  });
  it('last month range ends where this month starts', () => {
    const [, to] = periodRange('last', new Date(2026, 10, 27));
    expect(to).toBe(new Date(2026, 10, 1).getTime());
  });
});

describe('csv', () => {
  it('quotes cells with commas, quotes and new lines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it('includes accountant and software columns', () => {
    const csv = leadsToCsv([lead({ accountant: 'Pintu', curSw: 'Equal' })]);
    expect(csv.split('\n')[0]).toContain('Accountant,Current software');
    expect(csv.split('\n')[1]).toContain('Pintu,Equal');
  });
});

describe('periodRange end', () => {
  it('includes all of today, so a deal closed this morning counts', () => {
    const morning = new Date(2026, 10, 28, 9, 30);
    const [, to] = periodRange('all', morning);
    expect(to).toBe(new Date(2026, 10, 29).getTime());
  });
});
