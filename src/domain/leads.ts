import type { Activity, ActivityKind, Lead, Status } from '../types';
import { today } from '../utils/dates';

export const STATUS_LABEL: Record<Status, string> = {
  call: 'To call',
  demo: 'Demo scheduled',
  given: 'Demo given',
  changes: 'Changes',
  redemo: 'Re-demo',
  closed: 'Won',
  rejected: 'Rejected',
};

export const ACTIVE: Status[] = ['call', 'demo', 'given', 'changes', 'redemo'];
export const PIPELINE: { key: Status; label: string }[] = [
  { key: 'call', label: 'To call' },
  { key: 'demo', label: 'Demo' },
  { key: 'given', label: 'Given' },
  { key: 'changes', label: 'Changes' },
  { key: 'redemo', label: 'Re-demo' },
];

export const REJECT_REASONS = [
  'Too expensive', 'Not interested', 'Using competitor software', 'No budget right now',
  'Need more time', 'Feature not available', 'Could not reach', 'Other',
];

export const isActive = (l: Lead): boolean => ACTIVE.includes(l.st);
export const isDemoStatus = (st: Status): boolean => st === 'demo' || st === 'redemo';
export const hasDemo = (l: Lead): boolean => isDemoStatus(l.st) && !!l.dd;
export const lastTouch = (l: Lead): number => l.touchedAt || l.createdAt || 0;

/** The earliest upcoming thing to do for a lead: its demo or its follow-up. */
export const nextDate = (l: Lead): string | null => {
  const c: string[] = [];
  if (hasDemo(l) && l.dd) c.push(l.dd);
  if (l.fu) c.push(l.fu);
  return c.sort()[0] || null;
};

/**
 * Yearly maintenance date for cash clients: closed on or before the 15th → 1st of the same month next year;
 * after the 15th → 1st of the following month next year.
 */
export const maintenanceDate = (l: Lead): Date | null => {
  if (!l.cd) return null;
  const d = new Date(`${l.cd}T00:00:00`);
  const month = d.getMonth() + (d.getDate() > 15 ? 1 : 0);
  return new Date(d.getFullYear() + 1, month, 1);
};

export const maintenanceDays = (l: Lead, now: Date = new Date()): number | null => {
  const m = maintenanceDate(l);
  return m ? Math.ceil((m.getTime() - now.getTime()) / 86400000) : null;
};

export const activity = (k: ActivityKind, x: string): Activity => ({ k, x, t: Date.now() });

/** Timestamps for the funnel, set the first time a lead enters a stage. */
export const stageStamps = (prev: Status | null, st: Status): Partial<Lead> => {
  if (st === prev) return {};
  const now = Date.now();
  if (isDemoStatus(st)) return { demoAt: now };
  if (st === 'given') return { givenAt: now };
  if (st === 'rejected') return { lostAt: now };
  if (st === 'closed') return { wonAt: now };
  return {};
};

export const isOverdue = (l: Lead, t: string = today()): boolean => {
  const n = nextDate(l);
  return !!n && n < t;
};

export const goingCold = (l: Lead, t: string = today(), now: number = Date.now()): boolean => {
  const n = nextDate(l);
  return isActive(l) && now - lastTouch(l) > 7 * 86400000 && !(n && n >= t);
};
