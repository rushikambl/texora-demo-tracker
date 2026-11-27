import { hasDemo, isActive, nextDate, STATUS_LABEL } from '../domain/leads';
import type { Lead } from '../types';
import { dayDiff, fmtT, rel, today } from '../utils/dates';
import { esc } from '../utils/dom';
import { initials, money } from '../utils/format';

export const tag = (l: Lead): string => `<span class="tag t-${l.st}">${STATUS_LABEL[l.st] || esc(l.st)}</span>`;

export const empty = (title: string, sub: string): string => `<div class="empty"><b>${esc(title)}</b>${esc(sub)}</div>`;

/** One tappable lead row; `right` is pre-escaped markup for the right column. */
export const leadRow = (l: Lead, right: string): string => {
  const sub = [l.co, l.city, l.accountant ? `Acct: ${l.accountant}` : '', l.curSw].filter(Boolean).join(', ');
  return `<button type="button" class="lead-row" data-action="detail" data-arg="${esc(l.id)}">
    <span class="av t-${l.st}">${esc(initials(l.name))}${l.temp === 'hot' ? '<i class="hot" aria-label="Hot lead"></i>' : ''}</span>
    <span class="lead-info"><span class="lead-name">${esc(l.name)}</span><span class="lead-sub">${esc(sub) || '&nbsp;'}</span></span>
    <span class="lead-right">${right}</span></button>`;
};

export const nextMeta = (l: Lead): string => {
  const n = nextDate(l);
  if (!n) return '<span class="lead-meta">No follow-up set</span>';
  const d = dayDiff(n);
  const isDemo = hasDemo(l) && l.dd === n;
  const label = `${isDemo ? 'Demo ' : 'Call '}${rel(n)}${isDemo && l.dt ? ` ${fmtT(l.dt)}` : ''}`;
  return `<span class="lead-meta ${d < 0 ? 'over' : d === 0 ? 'today' : ''}">${esc(label)}</span>`;
};

/** Right column for the main lead list. */
export const listRight = (l: Lead): string => {
  if (isActive(l)) return tag(l) + nextMeta(l);
  if (l.st === 'closed') return `${tag(l)}<span class="lead-meta">${money(l.amt)}</span>`;
  return `${tag(l)}<span class="lead-meta">${esc(l.rejectReason || '')}</span>`;
};

export const isToday = (s?: string | null): boolean => !!s && s === today();

/** Set the pressed button in a segmented control (single choice). */
export const setSeg = (groupId: string, value: string): void => {
  document.querySelectorAll<HTMLButtonElement>(`#${groupId} button`).forEach((b) =>
    b.setAttribute('aria-pressed', String(b.dataset.v === value)),
  );
};

export const segValue = (groupId: string): string =>
  document.querySelector<HTMLButtonElement>(`#${groupId} button[aria-pressed=true]`)?.dataset.v || '';
