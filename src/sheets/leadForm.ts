import { createLead, updateLead } from '../data/firebase';
import { ensureMaster } from '../data/masterSync';
import { ACTIVE, activity, isDemoStatus, stageStamps, STATUS_LABEL } from '../domain/leads';
import { MASTER_TYPES, namesOf } from '../domain/masters';
import { findLead, state } from '../state';
import type { Lead, LeadData, MasterType, Status, Temperature } from '../types';
import { on } from '../ui/actions';
import { segValue, setSeg } from '../ui/components';
import { busy, closeSheet, openSheet, swapSheet, validate } from '../ui/sheets';
import { fail, toast } from '../ui/toast';
import { addDays, today } from '../utils/dates';
import { el, esc, html, select, setVal, show, val } from '../utils/dom';
import { digits, same, splitList } from '../utils/format';

let pickedSoftware: string[] = [];

const fillMasterSelect = (id: string, t: MasterType, current: string): void => {
  const names = namesOf(state.masters, t);
  if (current && !names.some((n) => same(n, current))) names.push(current);
  html(id, `<option value="">Not set</option>${names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}<option value="__new">+ Add new ${MASTER_TYPES[t].one}…</option>`);
  select(id).value = current || '';
  show(`${id}-new`, false);
  setVal(`${id}-new`, '');
};

const drawSoftware = (): void => {
  const all = namesOf(state.masters, 'sw');
  pickedSoftware.forEach((x) => { if (!all.some((n) => same(n, x))) all.push(x); });
  html('f-cursw', all.length
    ? all.map((n) => `<button type="button" aria-pressed="${pickedSoftware.some((x) => same(x, n))}" data-action="swToggle" data-v="${esc(n)}">${esc(n)}</button>`).join('')
    : '<span class="lead-sub">No software in Masters yet</span>');
};

/** Selected value of a master dropdown, or the typed name when "+ Add new…" is chosen. */
const masterValue = (id: string): string => (select(id).value === '__new' ? val(`${id}-new`) : select(id).value);

const toggleStatusFields = (): void => {
  const st = select('f-st').value as Status;
  show('f-demo-wrap', isDemoStatus(st));
  show('f-won-wrap', st === 'closed');
  show('f-fu-wrap', ACTIVE.includes(st));
  show('f-note-wrap', !val('f-id'));
};

export const openLeadForm = (lead?: Lead): void => {
  const e: Partial<Lead> = lead || {};
  setVal('f-id', e.id || '');
  el('form-title').textContent = lead ? 'Edit lead' : 'New lead';
  el('f-save').textContent = lead ? 'Save changes' : 'Save lead';
  setVal('f-name', e.name); setVal('f-ph', e.ph); setVal('f-co', e.co); setVal('f-city', e.city); setVal('f-email', e.email);
  setVal('f-sw', e.sw);
  fillMasterSelect('f-acc', 'acc', e.accountant || '');
  fillMasterSelect('f-biz', 'biz', e.biz || '');
  fillMasterSelect('f-ref', 'ref', e.ref || '');
  pickedSoftware = splitList(e.curSw);
  drawSoftware();
  setVal('f-cursw-new', '');
  select('f-src').value = e.src || 'Reference';
  setSeg('f-temp-seg', e.temp ?? (lead ? '' : 'warm'));
  setVal('f-val', e.val ?? '');
  select('f-st').value = e.st || 'call';
  setVal('f-dd', e.dd || today()); setVal('f-dt', e.dt || ''); select('f-dtype').value = e.dtype || 'offline'; setVal('f-loc', e.loc || '');
  select('f-pay').value = e.pay || 'cheque'; setVal('f-amt', e.amt ?? ''); setVal('f-cd', e.cd || today());
  setVal('f-fu', lead ? e.fu || '' : addDays(today(), 1));
  setVal('f-note', '');
  show('f-dup', false);
  toggleStatusFields();
  openSheet('formOv');
};

const saveForm = async (): Promise<void> => {
  if (!validate('formOv')) return;
  busy('formOv');
  const id = val('f-id');
  const prev = id ? findLead(id) : undefined;
  const st = select('f-st').value as Status;
  const demo = isDemoStatus(st);
  const won = st === 'closed';
  const data: Partial<LeadData> = {
    name: val('f-name'), ph: val('f-ph'), co: val('f-co'), city: val('f-city'), email: val('f-email'), sw: val('f-sw'),
    accountant: masterValue('f-acc'), curSw: pickedSoftware.join(' + '), biz: masterValue('f-biz'),
    src: select('f-src').value, ref: masterValue('f-ref'), temp: segValue('f-temp-seg') as Temperature,
    val: val('f-val') ? Number(val('f-val')) : null, st,
    dd: demo ? val('f-dd') : null, dt: demo ? val('f-dt') || null : null, dtype: demo ? (select('f-dtype').value as 'offline' | 'online') : null, loc: demo ? val('f-loc') : null,
    pay: won ? (select('f-pay').value as 'cheque' | 'cash' | 'upi') : null, amt: won ? Number(val('f-amt')) || 0 : null, cd: won ? val('f-cd') : null,
    fu: ACTIVE.includes(st) ? val('f-fu') || null : null,
  };
  try {
    await Promise.all([
      ensureMaster('acc', data.accountant), ensureMaster('ref', data.ref), ensureMaster('biz', data.biz),
      ...pickedSoftware.map((s) => ensureMaster('sw', s)),
    ]);
    if (prev) {
      Object.assign(data, stageStamps(prev.st, st));
      if (st === 'rejected' && prev.st !== 'rejected' && !prev.rejectReason) data.rejectReason = 'Other';
      await updateLead(prev.id, data, prev.st !== st ? activity('status', `Status changed to ${STATUS_LABEL[st]}`) : undefined);
      closeSheet('formOv');
      toast('Lead updated');
    } else {
      const now = Date.now();
      const note = val('f-note');
      const created = activity('created', `Lead added${data.src ? ` from ${data.src}` : ''}${data.ref ? ` (${data.ref})` : ''}`);
      await createLead({
        ...(data as LeadData), ...stageStamps(null, st), createdAt: now, touchedAt: now,
        rejectReason: st === 'rejected' ? 'Other' : null,
        act: note ? [created, { k: 'note', x: note, t: now + 1 }] : [created],
      });
      closeSheet('formOv');
      toast('Lead saved');
    }
  } catch (e) {
    fail('Could not save. Check your connection.')(e);
  }
};

on({
  openForm: () => openLeadForm(),
  edit: (b) => {
    const lead = findLead(b.dataset.arg || '');
    if (lead) swapSheet('detOv', 'formOv', () => openLeadForm(lead));
  },
  saveForm,
  formToggle: toggleStatusFields,
  newOpt: (s) => {
    const on_ = (s as HTMLSelectElement).value === '__new';
    show(`${s.id}-new`, on_);
    if (on_) el(`${s.id}-new`).focus();
  },
  seg: (b) => {
    const group = b.parentElement?.id || '';
    const wasOn = b.getAttribute('aria-pressed') === 'true';
    setSeg(group, wasOn && group === 'f-temp-seg' ? '' : b.dataset.v || '');
  },
  swToggle: (b) => {
    const v = b.dataset.v || '';
    const wasOn = b.getAttribute('aria-pressed') === 'true';
    pickedSoftware = wasOn ? pickedSoftware.filter((x) => !same(x, v)) : [...pickedSoftware, v];
    b.setAttribute('aria-pressed', String(!wasOn));
  },
  swChip: () => {
    const v = val('f-cursw-new');
    if (!v) return;
    if (!pickedSoftware.some((x) => same(x, v))) pickedSoftware.push(v);
    setVal('f-cursw-new', '');
    drawSoftware();
  },
  dupCheck: () => {
    const d = digits(val('f-ph'));
    const id = val('f-id');
    const match = d.length >= 10 ? state.leads.find((l) => l.id !== id && digits(l.ph) === d) : undefined;
    show('f-dup', !!match);
    el('f-dup').textContent = match ? `Already a lead: ${match.name}${match.co ? ` (${match.co})` : ''}, ${STATUS_LABEL[match.st]}.` : '';
  },
});
