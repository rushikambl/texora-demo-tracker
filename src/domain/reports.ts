import type { Lead } from '../types';
import { isActive } from './leads';

export type Period = 'month' | 'last' | '90' | 'all';

export const periodRange = (period: Period, now: Date = new Date()): [number, number] => {
  let from = 0;
  let to = now.getTime() + 1;
  if (period === 'month') from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  else if (period === 'last') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
    to = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  } else if (period === '90') from = now.getTime() - 90 * 86400000;
  return [from, to];
};

export interface ReportData {
  added: Lead[];
  givenCount: number;
  won: Lead[];
  lost: Lead[];
  revenue: number;
  winRate: number;
  pipeline: number;
  funnel: [string, number][];
  sources: { name: string; leads: number; won: number; revenue: number }[];
  reasons: { name: string; count: number }[];
}

const reachedDemo = (l: Lead): boolean => ['demo', 'given', 'changes', 'redemo', 'closed'].includes(l.st) || !!l.demoAt || !!l.givenAt;
const gaveDemo = (l: Lead): boolean => ['given', 'changes', 'redemo', 'closed'].includes(l.st) || !!l.givenAt;

export const buildReport = (leads: Lead[], period: Period, now: Date = new Date()): ReportData => {
  const [a, b] = periodRange(period, now);
  const inP = (ts?: number) => !!ts && ts >= a && ts < b;
  const dateIn = (s?: string | null) => !!s && inP(new Date(`${s}T12:00:00`).getTime());

  const added = leads.filter((l) => inP(l.createdAt));
  const won = leads.filter((l) => l.st === 'closed' && dateIn(l.cd));
  const lost = leads.filter((l) => l.st === 'rejected' && inP(l.lostAt));
  const revenue = won.reduce((s, l) => s + (Number(l.amt) || 0), 0);
  const decided = won.length + lost.length;

  const src = new Map<string, { leads: number; won: number; revenue: number }>();
  added.forEach((l) => {
    const k = l.src || 'Other';
    const r = src.get(k) || { leads: 0, won: 0, revenue: 0 };
    r.leads += 1;
    if (l.st === 'closed') { r.won += 1; r.revenue += Number(l.amt) || 0; }
    src.set(k, r);
  });

  const reasons = new Map<string, number>();
  lost.forEach((l) => reasons.set(l.rejectReason || 'Other', (reasons.get(l.rejectReason || 'Other') || 0) + 1));

  return {
    added,
    givenCount: leads.filter((l) => inP(l.givenAt)).length,
    won,
    lost,
    revenue,
    winRate: decided ? Math.round((won.length * 100) / decided) : 0,
    pipeline: leads.filter(isActive).reduce((s, l) => s + (Number(l.val) || 0), 0),
    funnel: [
      ['Leads added', added.length],
      ['Demo booked', added.filter(reachedDemo).length],
      ['Demo given', added.filter(gaveDemo).length],
      ['Won', added.filter((l) => l.st === 'closed').length],
    ],
    sources: [...src.entries()].map(([name, r]) => ({ name, ...r })).sort((x, y) => y.leads - x.leads),
    reasons: [...reasons.entries()].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count),
  };
};
