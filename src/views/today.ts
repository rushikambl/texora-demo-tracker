import { goingCold, hasDemo, isActive, lastTouch, maintenanceDays, nextDate, PIPELINE } from '../domain/leads';
import { state } from '../state';
import { empty, leadRow, tag } from '../ui/components';
import { ago, fmtT, rel, today } from '../utils/dates';
import { el, esc, html, show } from '../utils/dom';
import { money } from '../utils/format';

export const renderToday = (): void => {
  const t = today();
  const open = state.leads.filter(isActive);
  const demos = open.filter((l) => hasDemo(l) && l.dd === t).sort((a, b) => (a.dt || '99').localeCompare(b.dt || '99'));
  const followUps = open.filter((l) => l.fu && l.fu <= t).sort((a, b) => (a.fu || '').localeCompare(b.fu || ''));
  const overdue = open.filter((l) => {
    const n = nextDate(l);
    return !!n && n < t;
  });

  el('s-demos').textContent = String(demos.length);
  el('s-fu').textContent = String(followUps.length);
  el('s-over').textContent = String(overdue.length);
  el('s-over-wrap').classList.toggle('warn', overdue.length > 0);
  const badge = el('b-today');
  badge.textContent = String(overdue.length);
  badge.style.display = overdue.length ? 'block' : 'none';

  // pipeline bar
  const counts = PIPELINE.map((p) => state.leads.filter((l) => l.st === p.key).length);
  const total = counts.reduce((a, b) => a + b, 0);
  el('pipe-val').textContent = money(open.reduce((s, l) => s + (Number(l.val) || 0), 0));
  html('pipe-bar', PIPELINE.map((p, i) =>
    `<button type="button" class="pipe-seg c-${p.key}" style="flex-grow:${total ? counts[i] : 1}" data-action="filter" data-arg="${p.key}" aria-label="${p.label}: ${counts[i]}"></button>`).join(''));
  html('pipe-legend', PIPELINE.map((p, i) =>
    `<button type="button" class="pipe-item" data-action="filter" data-arg="${p.key}"><span class="pipe-n"><i class="c-${p.key}"></i>${counts[i]}</span><span class="pipe-l">${p.label}</span></button>`).join(''));

  // maintenance due for cash clients
  const due = state.leads
    .filter((l) => l.st === 'closed' && l.pay === 'cash' && l.cd)
    .map((l) => ({ l, d: maintenanceDays(l) }))
    .filter((x): x is { l: typeof x.l; d: number } => x.d != null && x.d <= 30);
  html('maint-alerts', due.map(({ l, d }) => {
    const msg = d < 0 ? `Maintenance overdue by ${-d} days` : d === 0 ? 'Maintenance due today' : `Maintenance due in ${d} days`;
    return `<button type="button" class="alert" data-action="detail" data-arg="${esc(l.id)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4.5h-4.5"/></svg><span><strong>${esc(l.name)}</strong><span>${msg}</span></span></button>`;
  }).join(''));

  el('c-demos').textContent = demos.length ? `${demos.length} scheduled` : '';
  html('l-demos', !state.leadsLoaded ? el('l-demos').innerHTML : demos.length
    ? demos.map((l) => leadRow(l, `<span class="tag t-${l.st}">${l.dt ? fmtT(l.dt) : 'Today'}</span><span class="lead-meta">${l.dtype === 'online' ? 'Online' : 'Offline'}</span>`)).join('')
    : empty('No demos today', 'Schedule one from a lead, or add a new lead.'));

  el('c-fu').textContent = followUps.length ? `${followUps.length} to call` : '';
  html('l-fu', followUps.length
    ? followUps.map((l) => leadRow(l, tag(l) + `<span class="lead-meta ${(l.fu || '') < t ? 'over' : 'today'}">${(l.fu || '') < t ? `Overdue ${rel(l.fu || '').toLowerCase()}` : 'Due today'}</span>`)).join('')
    : empty('All caught up', 'No follow-ups due today.'));

  const cold = open.filter((l) => goingCold(l, t)).sort((a, b) => lastTouch(a) - lastTouch(b)).slice(0, 6);
  show('cold-wrap', cold.length > 0);
  html('l-cold', cold.map((l) => leadRow(l, tag(l) + `<span class="lead-meta">Last contact ${ago(lastTouch(l))}</span>`)).join(''));
};
