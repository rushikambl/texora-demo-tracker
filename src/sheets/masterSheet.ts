import { removeMaster, updateLead, updateMaster } from '../data/firebase';
import { activity } from '../domain/leads';
import { leadsUsing, MASTER_TYPES, renamedValue } from '../domain/masters';
import { state } from '../state';
import { on } from '../ui/actions';
import { busy, closeSheet, openSheet, validate } from '../ui/sheets';
import { fail, toast } from '../ui/toast';
import { el, setVal, show, val } from '../utils/dom';
import { capitalize, same } from '../utils/format';
import { showLeadsFor } from '../views/leads';

const FILTER_FOR = { acc: 'f-acc-f', sw: 'f-sw-f', ref: 'f-ref-f', biz: 'f-biz-f' } as const;

const current = () => state.masters.find((m) => m.id === val('me-id'));

on({
  mEdit: (b) => {
    const m = state.masters.find((x) => x.id === b.dataset.arg);
    if (!m) return;
    const info = MASTER_TYPES[m.t];
    const used = leadsUsing(state.leads, m.t, m.name);
    setVal('me-id', m.id);
    el('me-title').textContent = `Edit ${info.one}`;
    setVal('me-name', m.name);
    setVal('me-phone', m.phone || '');
    show('me-phone-wrap', info.phone);
    el('me-info').textContent = used.length
      ? `Used by ${used.length} lead${used.length === 1 ? '' : 's'}. Renaming updates all of them.`
      : 'Not used by any lead yet.';
    show('me-leads', used.length > 0, 'flex');
    const del = el('me-del');
    del.dataset.sure = '';
    del.textContent = used.length ? `Delete and clear from ${used.length} lead${used.length === 1 ? '' : 's'}` : 'Delete';
    openSheet('mOv');
  },

  mSave: async () => {
    if (!validate('mOv')) return;
    const m = current();
    if (!m?.id) return;
    const name = val('me-name');
    if (!same(name, m.name) && state.masters.some((x) => x.t === m.t && x.id !== m.id && same(x.name, name))) {
      toast(`${name} already exists`);
      return;
    }
    busy('mOv');
    const info = MASTER_TYPES[m.t];
    try {
      await updateMaster(m.id, { name, phone: info.phone ? val('me-phone') : '' });
      if (name !== m.name) {
        for (const l of leadsUsing(state.leads, m.t, m.name)) {
          await updateLead(l.id, { [info.field]: renamedValue(l, m.t, m.name, name) },
            activity('status', `${capitalize(info.one)} renamed from ${m.name} to ${name}`));
        }
      }
      closeSheet('mOv');
      toast('Saved');
    } catch (e) {
      fail('Could not save. Check your connection.')(e);
    }
  },

  mDel: async (btn) => {
    const m = current();
    if (!m?.id) return;
    const info = MASTER_TYPES[m.t];
    const used = leadsUsing(state.leads, m.t, m.name);
    if (used.length && btn.dataset.sure !== '1') {
      btn.dataset.sure = '1';
      btn.textContent = `Tap again to remove ${m.name} from ${used.length} lead${used.length === 1 ? '' : 's'}`;
      return;
    }
    btn.dataset.sure = '';
    try {
      for (const l of used) await updateLead(l.id, { [info.field]: renamedValue(l, m.t, m.name, '') });
      await removeMaster(m.id);
      closeSheet('mOv');
      toast(`Deleted ${m.name}`);
    } catch (e) {
      fail('Could not delete.')(e);
    }
  },

  mLeads: () => {
    const m = current();
    if (!m) return;
    closeSheet('mOv');
    showLeadsFor(FILTER_FOR[m.t], m.name);
  },
});
