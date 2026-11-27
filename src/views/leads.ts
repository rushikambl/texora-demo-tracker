import { isActive, nextDate, STATUS_LABEL } from '../domain/leads';
import { state } from '../state';
import type { Lead, Status } from '../types';
import { on } from '../ui/actions';
import { empty, leadRow, listRight } from '../ui/components';
import { el, esc, html, select } from '../utils/dom';
import { blankLast, digits, same, splitList } from '../utils/format';
import { go } from './nav';

const CHIPS: [string, string][] = [
  ['active', 'Open'], ['call', 'To call'], ['demo', 'Demo scheduled'], ['given', 'Demo given'], ['changes', 'Changes'],
  ['redemo', 'Re-demo'], ['closed', 'Won'], ['rejected', 'Rejected'], ['all', 'All'],
];

type Filter = { id: string; any: string; values: (l: Lead) => string[]; match: (l: Lead, v: string) => boolean; empty: (l: Lead) => boolean };

const FILTERS: Filter[] = [
  { id: 'f-acc-f', any: 'Any accountant', values: (l) => [l.accountant || ''], match: (l, v) => same(l.accountant, v), empty: (l) => !l.accountant },
  { id: 'f-sw-f', any: 'Any software', values: (l) => splitList(l.curSw), match: (l, v) => splitList(l.curSw).some((x) => same(x, v)), empty: (l) => !l.curSw },
  { id: 'f-ref-f', any: 'Any reference', values: (l) => [l.ref || ''], match: (l, v) => same(l.ref, v), empty: (l) => !l.ref },
  { id: 'f-biz-f', any: 'Any business', values: (l) => [l.biz || ''], match: (l, v) => same(l.biz, v), empty: (l) => !l.biz },
];

const SORTS: Record<string, (a: Lead, b: Lead) => number> = {
  next: (a, b) => (nextDate(a) || '9999').localeCompare(nextDate(b) || '9999') || (b.createdAt || 0) - (a.createdAt || 0),
  recent: (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
  value: (a, b) => (Number(b.val) || 0) - (Number(a.val) || 0),
  name: (a, b) => (a.name || '').localeCompare(b.name || ''),
  co: (a, b) => blankLast(a.co, b.co),
  acc: (a, b) => blankLast(a.accountant, b.accountant) || blankLast(a.co, b.co),
  ref: (a, b) => blankLast(a.ref, b.ref) || blankLast(a.co, b.co),
  biz: (a, b) => blankLast(a.biz, b.biz) || blankLast(a.co, b.co),
  cursw: (a, b) => blankLast(a.curSw, b.curSw) || blankLast(a.co, b.co),
};

/** Fill a filter dropdown with the values leads actually use; keeps the current choice when still valid. */
const fillFilter = (f: Filter): void => {
  const sel = select(f.id);
  const current = sel.value;
  const set = new Set<string>();
  state.leads.forEach((l) => f.values(l).forEach((v) => v && set.add(v.trim())));
  const opts = [...set].sort((a, b) => a.localeCompare(b));
  const markup = `<option value="">${f.any}</option>${opts.map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}<option value="__none">Not set</option>`;
  if (sel.dataset.h === markup) return;
  sel.innerHTML = markup;
  sel.dataset.h = markup;
  sel.value = opts.includes(current) || current === '__none' ? current : '';
};

export const renderLeads = (): void => {
  const counts: Record<string, number> = { active: state.leads.filter(isActive).length, all: state.leads.length };
  (Object.keys(STATUS_LABEL) as Status[]).forEach((k) => { counts[k] = state.leads.filter((l) => l.st === k).length; });
  html('st-chips', CHIPS.map(([k, label]) =>
    `<button type="button" class="chip ${state.statusFilter === k ? 'active' : ''}" aria-pressed="${state.statusFilter === k}" data-action="filterStay" data-arg="${k}">${label}<span class="n">${counts[k] || 0}</span></button>`).join(''));

  FILTERS.forEach(fillFilter);

  let list = state.statusFilter === 'all' ? state.leads.slice()
    : state.statusFilter === 'active' ? state.leads.filter(isActive)
      : state.leads.filter((l) => l.st === state.statusFilter);

  const temp = select('f-temp').value;
  if (temp) list = list.filter((l) => l.temp === temp);
  FILTERS.forEach((f) => {
    const v = select(f.id).value;
    if (v) list = list.filter((l) => (v === '__none' ? f.empty(l) : f.match(l, v)));
  });
  if (state.query) {
    const q = state.query.toLowerCase();
    const dq = state.query.replace(/\D/g, '');
    list = list.filter((l) =>
      [l.name, l.co, l.city, l.sw, l.ref, l.src, l.email, l.accountant, l.curSw, l.biz].some((v) => (v || '').toLowerCase().includes(q))
      || (dq.length >= 3 && digits(l.ph).includes(dq)));
  }
  list.sort(SORTS[select('f-sort').value] || SORTS.next);

  if (!state.leadsLoaded) return;
  html('l-leads', list.length ? list.map((l) => leadRow(l, listRight(l))).join('')
    : state.leads.length ? empty('No leads match', 'Try another filter or clear the search.')
      : empty('No leads yet', 'Tap New lead to add your first one.'));
};

/** Show the Leads tab filtered to one master value (used from Masters). */
export const showLeadsFor = (filterId: string, value: string): void => {
  FILTERS.forEach((f) => { select(f.id).value = ''; });
  state.statusFilter = 'all';
  go('leads');
  renderLeads();
  const sel = select(filterId);
  sel.value = [...sel.options].find((o) => same(o.value, value))?.value || '';
  renderLeads();
};

on({
  filter: (b) => { state.statusFilter = b.dataset.arg || 'active'; go('leads'); renderLeads(); },
  filterStay: (b) => { state.statusFilter = b.dataset.arg || 'active'; renderLeads(); },
  renderLeads: () => renderLeads(),
  search: (inp) => {
    state.query = (inp as HTMLInputElement).value.trim();
    el('q-clear').style.display = state.query ? 'block' : 'none';
    renderLeads();
  },
  clearSearch: () => {
    const q = el<HTMLInputElement>('q');
    q.value = '';
    state.query = '';
    el('q-clear').style.display = 'none';
    q.focus();
    renderLeads();
  },
});
