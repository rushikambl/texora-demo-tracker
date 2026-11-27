import { state } from '../state';
import { on } from './actions';
import { closeSheet, openSheet } from './sheets';
import { openLeadForm } from '../sheets/leadForm';
import { currentTab, go, type Tab } from '../views/nav';
import { el, html } from '../utils/dom';

/** Same scheme as TradeJournal: one letter per page, N for new, ? for this list, Esc to close. */
const PAGE_KEYS: Record<string, Tab> = { d: 'today', l: 'leads', a: 'agenda', r: 'reports', c: 'clients', m: 'masters' };
const PERIOD_KEYS: Record<string, string> = { '1': 'month', '2': 'last', '9': '90', '0': 'all' };

const SHORTCUTS: [string[], string][] = [
  [['N'], 'New lead'],
  [['/'], 'Search leads'],
  [['D'], 'Today'], [['L'], 'Leads'], [['A'], 'Agenda'], [['R'], 'Reports'], [['C'], 'Clients'], [['M'], 'Masters'],
  [['J'], 'Next lead in list'], [['K'], 'Previous lead in list'], [['Enter'], 'Open selected lead'],
  [['E'], 'Edit lead (in lead details)'], [['G'], 'Log a call (in lead details)'], [['U'], 'Update status (in lead details)'],
  [['1'], 'Reports: this month'], [['2'], 'Reports: last month'], [['9'], 'Reports: last 90 days'], [['0'], 'Reports: all time'],
  [['?'], 'This list'], [['Esc'], 'Close'],
];

const showShortcuts = (): void => {
  html('kb-list', SHORTCUTS.map(([keys, label]) =>
    `<div class="kb-row"><span>${label}</span><span>${keys.map((k) => `<kbd class="kb">${k}</kbd>`).join(' ')}</span></div>`).join(''));
  openSheet('kbOv');
};

/** Move the keyboard selection through the visible lead rows of the current page. */
const moveSelection = (step: number): void => {
  const rows = [...document.querySelectorAll<HTMLElement>('.panel.active .lead-row')];
  if (!rows.length) return;
  const i = rows.findIndex((r) => r === document.activeElement);
  const next = rows[Math.max(0, Math.min(rows.length - 1, i < 0 ? 0 : i + step))];
  next.focus();
  next.scrollIntoView({ block: 'nearest' });
};

const clickIn = (sheet: string, selector: string): void => {
  el(sheet).querySelector<HTMLElement>(selector)?.click();
};

export const startShortcuts = (): void => {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    const t = e.target as HTMLElement;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    const k = e.key.toLowerCase();
    const openOverlay = document.querySelector<HTMLElement>('.overlay.open');

    // Inside lead details: act on that lead.
    if (openOverlay?.id === 'detOv' && state.openLeadId) {
      const map: Record<string, string> = { e: '[data-action=edit]', g: '[data-action=openCall]', u: '[data-action=openStatus]' };
      if (map[k]) { e.preventDefault(); clickIn('detOv', map[k]); }
      return;
    }
    if (openOverlay) return;

    if (k === 'n') { e.preventDefault(); openLeadForm(); }
    else if (e.key === '?') { e.preventDefault(); showShortcuts(); }
    else if (e.key === '/') { e.preventDefault(); go('leads'); el<HTMLInputElement>('q').focus(); }
    else if (k === 'j') { e.preventDefault(); moveSelection(1); }
    else if (k === 'k') { e.preventDefault(); moveSelection(-1); }
    else if (PAGE_KEYS[k]) { e.preventDefault(); go(PAGE_KEYS[k]); }
    else if (currentTab() === 'reports' && PERIOD_KEYS[e.key]) {
      e.preventDefault();
      document.querySelector<HTMLElement>(`[data-action=setPeriod][data-arg="${PERIOD_KEYS[e.key]}"]`)?.click();
    }
  });
  on({ showShortcuts: () => { closeSheet('kbOv'); showShortcuts(); } });
};
