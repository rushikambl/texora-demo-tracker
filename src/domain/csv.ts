import type { Lead } from '../types';
import { STATUS_LABEL } from './leads';
import { ymd } from '../utils/dates';

type Col = [string, keyof Lead | ((l: Lead) => unknown)];

const COLUMNS: Col[] = [
  ['Name', 'name'], ['Phone', 'ph'], ['Company', 'co'], ['City', 'city'], ['Email', 'email'],
  ['Accountant', 'accountant'], ['Current software', 'curSw'], ['Business', 'biz'], ['Interested in', 'sw'],
  ['Source', 'src'], ['Referred by', 'ref'], ['Temperature', 'temp'], ['Expected value', 'val'],
  ['Status', (l) => STATUS_LABEL[l.st] || l.st], ['Demo date', 'dd'], ['Demo time', 'dt'], ['Demo type', 'dtype'],
  ['Follow-up', 'fu'], ['Amount', 'amt'], ['Payment', 'pay'], ['Closed on', 'cd'], ['Reject reason', 'rejectReason'],
  ['Added', (l) => (l.createdAt ? ymd(new Date(l.createdAt)) : '')],
  ['Last note', (l) => {
    const n = (l.act || []).filter((a) => a.k === 'note' || a.k === 'call').sort((a, b) => b.t - a.t)[0];
    return n ? n.x : '';
  }],
];

export const csvCell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const leadsToCsv = (leads: Lead[]): string =>
  [COLUMNS.map((c) => c[0]).join(',')]
    .concat(leads.map((l) => COLUMNS.map(([, k]) => csvCell(typeof k === 'function' ? k(l) : l[k])).join(',')))
    .join('\n');
