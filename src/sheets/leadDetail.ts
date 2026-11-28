import { COMPANY, USER } from '../config';
import { removeLead, updateLead } from '../data/firebase';
import { activity, hasDemo, isActive, maintenanceDate, maintenanceDays, REJECT_REASONS } from '../domain/leads';
import { findLead, state } from '../state';
import type { Lead } from '../types';
import { on } from '../ui/actions';
import { tag } from '../ui/components';
import { closeSheet, openSheet } from '../ui/sheets';
import { fail, toast } from '../ui/toast';
import { addDays, ago, fmtT, fmtY, rel, today, ymd } from '../utils/dates';
import { el, esc, html, select, setVal, show, val } from '../utils/dom';
import { capitalize, money, waNumber } from '../utils/format';

const ICON = {
  call: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  wa: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>',
  log: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  cal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M12 13v5M9.5 15.5h5"/></svg>',
  edit: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
};
const TL_LABEL: Record<string, string> = { call: 'Call', note: 'Note', status: 'Status', created: 'Created', followup: 'Follow-up' };
const PAY_LABEL: Record<string, string> = { upi: 'UPI / Bank', cash: 'Cash', cheque: 'Cheque' };

export const calendarUrl = (l: Lead): string => {
  const start = new Date(`${l.dd}T${l.dt || '10:00'}`);
  const end = new Date(start.getTime() + 3600000);
  const stamp = (d: Date) => `${ymd(d).replace(/-/g, '')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Demo: ${l.name}${l.co ? ` (${l.co})` : ''}`,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: [l.sw && `Software: ${l.sw}`, `Phone: ${l.ph}`].filter(Boolean).join('\n'),
    location: l.loc || '',
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
};

export const whatsappUrl = (l: Lead): string => {
  const first = (l.name || '').split(' ')[0];
  const msg = hasDemo(l)
    ? `Hello ${first}, this is ${USER} from ${COMPANY}. Confirming your ${l.sw || 'software'} demo on ${fmtY(l.dd)}${l.dt ? ` at ${fmtT(l.dt)}` : ''}${l.loc ? ` (${l.loc})` : ''}. See you then!`
    : `Hello ${first}, this is ${USER} from ${COMPANY}${l.sw ? ` regarding ${l.sw}` : ''}. When would be a good time to talk?`;
  return `https://wa.me/${waNumber(l.ph)}?text=${encodeURIComponent(msg)}`;
};

const notSet = '<span class="muted">Not set</span>';
const row = (label: string, value: string): string => `<div class="info-row"><span>${label}</span><span>${value}</span></div>`;

const nextBox = (l: Lead, t: string): string => {
  if (!isActive(l)) return '';
  const loc = l.loc ? `<div class="d-co">${/^https?:\/\//.test(l.loc) ? `<a href="${esc(l.loc)}" target="_blank" rel="noopener">${esc(l.loc)}</a>` : esc(l.loc)}</div>` : '';
  const demo = hasDemo(l) && l.dd
    ? `<div class="next-t">Demo</div><div class="next-v ${l.dd < t ? 'over' : ''}">${rel(l.dd)}${l.dt ? `, ${fmtT(l.dt)}` : ''} · ${l.dtype === 'online' ? 'Online' : 'Offline'}${loc}</div><div class="gap"></div>` : '';
  const fuBtn = (days: number, label: string) => `<button type="button" class="btn-sm" data-action="setFu" data-arg="${esc(l.id)}" data-days="${days}">${label}</button>`;
  return `<div class="next">${demo}
    <div class="next-t">Next follow-up</div><div class="next-v ${l.fu && l.fu < t ? 'over' : ''}">${l.fu ? rel(l.fu) + (l.fu < t ? ' (overdue)' : '') : 'Not set'}</div>
    <div class="fu-btns">${fuBtn(0, 'Today')}${fuBtn(1, '+1 day')}${fuBtn(3, '+3 days')}${fuBtn(7, '+1 week')}${l.fu ? fuBtn(-1, 'Clear') : ''}</div></div>
    <button type="button" class="btn-primary" data-action="openStatus" data-arg="${esc(l.id)}">Update status</button>
    ${hasDemo(l) ? `<button type="button" class="btn-ghost" data-action="quickGiven" data-arg="${esc(l.id)}">Mark demo as given</button>` : ''}`;
};

export const renderDetail = (id: string): void => {
  const l = findLead(id);
  if (!l) { closeSheet('detOv'); return; }
  const t = today();
  const md = l.st === 'closed' && l.pay === 'cash' ? maintenanceDays(l) : null;
  const m = md != null ? maintenanceDate(l) : null;
  const timeline = (l.act || []).slice().sort((a, b) => b.t - a.t);
  const lid = esc(l.id);

  html('d-body', `
  <div class="d-head"><div class="d-name" id="d-name">${esc(l.name)}</div><div class="d-co">${esc([l.co, l.city].filter(Boolean).join(', '))}</div></div>
  <div class="d-tags">${tag(l)}${l.temp ? `<span class="tag t-${l.temp}">${capitalize(l.temp)}</span>` : ''}${l.val && isActive(l) ? `<span class="tag t-value">${money(l.val)} expected</span>` : ''}</div>
  <div class="qa">
    <a class="call" href="tel:${esc(l.ph)}">${ICON.call}Call</a>
    <a class="wa" href="${esc(whatsappUrl(l))}" target="_blank" rel="noopener">${ICON.wa}WhatsApp</a>
    <button type="button" data-action="openCall" data-arg="${lid}">${ICON.log}Log call</button>
    ${hasDemo(l) ? `<a href="${esc(calendarUrl(l))}" target="_blank" rel="noopener">${ICON.cal}Calendar</a>` : `<button type="button" data-action="edit" data-arg="${lid}">${ICON.edit}Edit</button>`}
  </div>
  ${nextBox(l, t)}
  <div class="info">
    ${row('Phone', `<a href="tel:${esc(l.ph)}">${esc(l.ph)}</a>`)}
    ${l.email ? row('Email', `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>`) : ''}
    ${row('Accountant', l.accountant ? esc(l.accountant) : notSet)}
    ${row('Current software', l.curSw ? esc(l.curSw) : notSet)}
    ${l.biz ? row('Business', esc(l.biz)) : ''}
    ${l.sw ? row('Interested in', esc(l.sw)) : ''}
    ${l.src || l.ref ? row('Source', esc([l.src, l.ref].filter(Boolean).join(', '))) : ''}
    ${l.st === 'closed' ? row('Deal', `${money(l.amt)}, ${PAY_LABEL[l.pay || 'cheque']}`) + row('Closed on', fmtY(l.cd)) : ''}
    ${m && md != null ? row('Maintenance', `<span class="${md <= 30 ? 'over-text' : ''}">${m.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${md < 0 ? 'overdue' : `${md} days`})</span>`) : ''}
    ${l.rejectReason ? row('Rejected', `<span class="over-text">${esc(l.rejectReason)}${l.rejectNotes ? `: ${esc(l.rejectNotes)}` : ''}</span>`) : ''}
    ${row('Added', l.createdAt ? ago(l.createdAt) : '—')}
  </div>
  ${md != null && md <= 30 ? `<button type="button" class="btn-ghost" data-action="maintDone" data-arg="${lid}">Mark maintenance done</button>` : ''}
  <div class="sec-label flush">Activity <small>${timeline.length}</small></div>
  <div class="tl">
    <div class="tl-add"><input id="d-note" type="text" placeholder="Add a note" aria-label="Add a note" data-enter="addNote" data-arg="${lid}"><button type="button" class="btn-sm" data-action="addNote" data-arg="${lid}">Add</button></div>
    ${timeline.length ? timeline.map((a) => `<div class="tl-item"><span class="tl-dot ${esc(a.k)}"></span><div><div class="tl-x">${esc(a.x)}</div><div class="tl-t">${TL_LABEL[a.k] || ''} · ${ago(a.t)}</div></div></div>`).join('') : '<div class="lead-sub">No activity yet.</div>'}
  </div>
  <div class="row2"><button type="button" class="btn-ghost" data-action="edit" data-arg="${lid}">Edit lead</button>${
    isActive(l) ? '<button type="button" class="btn-danger" data-action="showBox" data-arg="rej">Mark rejected</button>'
      : l.st === 'rejected' ? `<button type="button" class="btn-ghost" data-action="reopen" data-arg="${lid}">Reopen lead</button>` : ''}</div>
  <div class="box" id="box-rej">
    <div class="box-t">Why did they say no?</div>
    <div class="field"><label for="r-reason">Reason</label><select id="r-reason">${REJECT_REASONS.map((r) => `<option>${r}</option>`).join('')}</select></div>
    <div class="field"><label for="r-notes">Notes (optional)</label><input id="r-notes" type="text"></div>
    <div class="row2"><button type="button" class="btn-ghost" data-action="hideBox" data-arg="rej">Cancel</button><button type="button" class="btn-primary btn-red" data-action="reject" data-arg="${lid}">Mark rejected</button></div>
  </div>
  <div class="box" id="box-del">
    <div class="box-t">Delete ${esc(l.name)} permanently? This can't be undone.</div>
    <div class="row2"><button type="button" class="btn-ghost" data-action="hideBox" data-arg="del">Keep lead</button><button type="button" class="btn-primary btn-red" data-action="del" data-arg="${lid}">Delete lead</button></div>
  </div>
  <button type="button" class="btn-ghost btn-quiet" data-action="showBox" data-arg="del">Delete lead</button>`);
};

export const openDetail = (id: string): void => {
  state.openLeadId = id;
  renderDetail(id);
  openSheet('detOv');
};

/** Re-render the open detail sheet when live data changes. */
export const refreshDetail = (): void => {
  if (state.openLeadId && el('detOv').classList.contains('open')) renderDetail(state.openLeadId);
};

const save = (id: string, data: Partial<Lead>, entry: ReturnType<typeof activity> | undefined, ok: string) =>
  updateLead(id, data, entry).then(() => toast(ok)).catch(fail('Could not update. Check your connection.'));

on({
  detail: (b) => openDetail(b.dataset.arg || ''),
  showBox: (b) => {
    show(`box-${b.dataset.arg}`, true);
    el(`box-${b.dataset.arg}`).scrollIntoView({ block: 'nearest' });
  },
  hideBox: (b) => show(`box-${b.dataset.arg}`, false),
  setFu: (b) => {
    const days = Number(b.dataset.days);
    const fu = days < 0 ? null : addDays(today(), days);
    return save(b.dataset.arg || '', { fu }, activity('followup', fu ? `Follow-up set for ${fmtY(fu)}` : 'Follow-up cleared'),
      fu ? `Follow-up ${rel(fu).toLowerCase()}` : 'Follow-up cleared');
  },
  addNote: (b) => {
    const text = val('d-note');
    if (!text) { el('d-note').focus(); return undefined; }
    return updateLead(b.dataset.arg || '', {}, activity('note', text))
      .then(() => { setVal('d-note', ''); toast('Note added'); })
      .catch(fail('Could not add the note.'));
  },
  quickGiven: (b) => {
    const l = findLead(b.dataset.arg || '');
    if (!l) return undefined;
    const fu = addDays(today(), 2);
    return save(l.id, { st: 'given', givenAt: Date.now(), fu },
      activity('status', `Demo given${l.dd ? ` (${fmtY(l.dd)})` : ''}. Follow-up set for ${fmtY(fu)}`), 'Demo marked as given');
  },
  reject: (b) => {
    const reason = select('r-reason').value;
    const notes = val('r-notes');
    return save(b.dataset.arg || '', { st: 'rejected', rejectReason: reason, rejectNotes: notes, lostAt: Date.now(), fu: null },
      activity('status', `Marked rejected: ${reason}${notes ? `\n${notes}` : ''}`), 'Marked as rejected');
  },
  reopen: (b) => save(b.dataset.arg || '', { st: 'call', rejectReason: null, rejectNotes: null, fu: today() },
    activity('status', 'Lead reopened'), 'Lead reopened'),
  maintDone: (b) => save(b.dataset.arg || '', { cd: today() }, activity('status', 'Maintenance done, next cycle starts'), 'Maintenance marked done'),
  del: (b) => removeLead(b.dataset.arg || '')
    .then(() => { closeSheet('detOv'); state.openLeadId = null; toast('Lead deleted'); })
    .catch(fail('Could not delete.')),
});
