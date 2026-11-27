import { hasDemo, isActive, STATUS_LABEL } from '../domain/leads';
import { state } from '../state';
import type { Lead } from '../types';
import { empty, leadRow } from '../ui/components';
import { addDays, fmt, fmtT, today } from '../utils/dates';
import { esc, html } from '../utils/dom';

interface Item { day: string; sort: string; lead: Lead; kind: 'demo' | 'fu' }

const dayLabel = (k: string, t: string): string => {
  if (k === 'over') return 'Overdue';
  if (k === t) return 'Today';
  if (k === addDays(t, 1)) return 'Tomorrow';
  return new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
};

export const renderAgenda = (): void => {
  const t = today();
  const end = addDays(t, 14);
  const items: Item[] = [];
  state.leads.filter(isActive).forEach((l) => {
    if (hasDemo(l) && l.dd && l.dd <= end) items.push({ day: l.dd < t ? 'over' : l.dd, sort: l.dd + (l.dt || '99'), lead: l, kind: 'demo' });
    if (l.fu && l.fu <= end) items.push({ day: l.fu < t ? 'over' : l.fu, sort: `${l.fu}zz`, lead: l, kind: 'fu' });
  });
  items.sort((a, b) => a.sort.localeCompare(b.sort));

  const groups = new Map<string, Item[]>();
  items.forEach((i) => groups.set(i.day, [...(groups.get(i.day) || []), i]));
  const keys = [...groups.keys()].sort((a, b) => (a === 'over' ? -1 : b === 'over' ? 1 : a.localeCompare(b)));

  html('agenda', keys.length ? keys.map((k) => {
    const rows = (groups.get(k) || []).map((i) => {
      const l = i.lead;
      const right = i.kind === 'demo'
        ? `<span class="tag t-${l.st}">Demo${l.dt ? ` ${fmtT(l.dt)}` : ''}</span><span class="lead-meta">${l.dtype === 'online' ? 'Online' : 'Offline'}${k === 'over' ? `, ${fmt(l.dd)}` : ''}</span>`
        : `<span class="tag t-call">Follow-up</span><span class="lead-meta">${k === 'over' ? fmt(l.fu) : esc(STATUS_LABEL[l.st])}</span>`;
      return leadRow(l, right);
    }).join('');
    return `<div class="day-head ${k === 'over' ? 'over' : k === t ? 'today' : ''}">${dayLabel(k, t)}</div><div class="lead-list">${rows}</div>`;
  }).join('') : empty('Nothing planned', 'Set follow-up dates on your leads to fill this up.'));
};
