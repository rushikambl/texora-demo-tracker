import { updateLead } from '../data/firebase';
import { ACTIVE, activity, isDemoStatus, stageStamps, STATUS_LABEL } from '../domain/leads';
import { findLead } from '../state';
import type { LeadData, Status } from '../types';
import { on } from '../ui/actions';
import { busy, closeSheet, swapSheet } from '../ui/sheets';
import { fail, toast } from '../ui/toast';
import { fmtT, fmtY, today } from '../utils/dates';
import { el, select, setVal, show, val } from '../utils/dom';
import { money } from '../utils/format';
import { openDetail } from './leadDetail';

const toggle = (): void => {
  const st = select('u-st').value as Status;
  show('u-demo-wrap', isDemoStatus(st));
  show('u-won-wrap', st === 'closed');
  show('u-fu-wrap', ACTIVE.includes(st));
};

on({
  openStatus: (b) => {
    const l = findLead(b.dataset.arg || '');
    if (!l) return;
    swapSheet('detOv', 'stOv', () => {
      setVal('u-id', l.id);
      el('u-title').textContent = l.name;
      select('u-st').value = l.st === 'rejected' ? 'call' : l.st;
      setVal('u-dd', l.dd || today()); setVal('u-dt', l.dt || ''); select('u-dtype').value = l.dtype || 'offline'; setVal('u-loc', l.loc || '');
      select('u-pay').value = l.pay || 'cheque'; setVal('u-amt', l.amt ?? l.val ?? ''); setVal('u-cd', l.cd || today());
      setVal('u-fu', l.fu || ''); setVal('u-note', '');
      toggle();
    });
  },
  updToggle: toggle,
  saveStatus: async () => {
    busy('stOv');
    const id = val('u-id');
    const l = findLead(id);
    if (!l) return;
    const st = select('u-st').value as Status;
    const data: Partial<LeadData> = { st, ...stageStamps(l.st, st) };
    if (isDemoStatus(st)) Object.assign(data, { dd: val('u-dd'), dt: val('u-dt') || null, dtype: select('u-dtype').value, loc: val('u-loc') });
    if (st === 'closed') Object.assign(data, { pay: select('u-pay').value, amt: Number(val('u-amt')) || 0, cd: val('u-cd'), fu: null });
    else data.fu = val('u-fu') || null;

    let text = l.st !== st ? `Status changed to ${STATUS_LABEL[st]}` : 'Status updated';
    if (isDemoStatus(st) && data.dd) text += ` for ${fmtY(data.dd)}${data.dt ? ` at ${fmtT(data.dt)}` : ''}`;
    if (st === 'closed') text += `, ${money(data.amt)}`;
    const note = val('u-note');
    if (note) text += `\n${note}`;
    try {
      await updateLead(id, data, activity('status', text));
      closeSheet('stOv');
      toast(st === 'closed' ? 'Deal won!' : 'Status updated');
      openDetail(id);
    } catch (e) {
      fail('Could not update. Check your connection.')(e);
    }
  },
});
