import { updateLead } from '../data/firebase';
import { activity } from '../domain/leads';
import { findLead } from '../state';
import type { LeadData } from '../types';
import { on } from '../ui/actions';
import { segValue, setSeg } from '../ui/components';
import { busy, closeSheet, swapSheet } from '../ui/sheets';
import { fail, toast } from '../ui/toast';
import { addDays, fmtY, today } from '../utils/dates';
import { el, input, setVal, show, val } from '../utils/dom';
import { openDetail } from './leadDetail';

let followUpTouched = false;

const outcomeChanged = (): void => {
  const o = segValue('c-out');
  const no = o === 'Not interested';
  show('c-fu-wrap', !no);
  show('c-rej-note', no);
  if (o === 'Not reachable' && !followUpTouched) setVal('c-fu', addDays(today(), 1));
};

on({
  openCall: (b) => {
    const l = findLead(b.dataset.arg || '');
    if (!l) return;
    swapSheet('detOv', 'callOv', () => {
      setVal('c-id', l.id);
      el('c-title').textContent = `Log call: ${l.name}`;
      setSeg('c-out', 'Interested');
      followUpTouched = false;
      setVal('c-note', '');
      setVal('c-fu', addDays(today(), 3));
      outcomeChanged();
    });
  },
  segCall: (b) => {
    setSeg('c-out', b.dataset.v || '');
    outcomeChanged();
  },
  cfu: (b) => {
    followUpTouched = true;
    setVal('c-fu', addDays(today(), Number(b.dataset.arg)));
  },
  saveCall: async () => {
    busy('callOv');
    const id = val('c-id');
    const l = findLead(id);
    if (!l) return;
    const outcome = segValue('c-out') || 'Call';
    const note = val('c-note');
    const data: Partial<LeadData> = { lastCall: Date.now() };
    if (outcome === 'Not interested') {
      Object.assign(data, { st: 'rejected', rejectReason: 'Not interested', rejectNotes: note, lostAt: Date.now(), fu: null });
    } else {
      data.fu = val('c-fu') || null;
    }
    if (outcome === 'Interested' && (!l.temp || l.temp === 'cold')) data.temp = 'warm';
    const text = `${outcome}${note ? `: ${note}` : ''}${data.fu ? `\nNext follow-up ${fmtY(data.fu)}` : ''}`;
    try {
      await updateLead(id, data, activity('call', text));
      closeSheet('callOv');
      toast(outcome === 'Not interested' ? 'Moved to Rejected' : 'Call logged');
      openDetail(id);
    } catch (e) {
      fail('Could not save the call.')(e);
    }
  },
});

/** Mark the follow-up as hand-picked so outcome changes don't overwrite it. */
export const startCallSheet = (): void => {
  input('c-fu').addEventListener('input', () => { followUpTouched = true; });
};
