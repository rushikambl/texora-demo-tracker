import { createMaster } from '../data/firebase';
import { leadsUsing, MASTER_ORDER, MASTER_TYPES } from '../domain/masters';
import { isActive } from '../domain/leads';
import { state } from '../state';
import type { MasterType } from '../types';
import { on } from '../ui/actions';
import { empty } from '../ui/components';
import { fail, toast } from '../ui/toast';
import { el, esc, html, input, setVal, show, val } from '../utils/dom';
import { initials, same } from '../utils/format';

export const renderMasters = (): void => {
  const t = state.masterType;
  const info = MASTER_TYPES[t];
  html('m-types', MASTER_ORDER.map((k) =>
    `<button type="button" class="chip ${t === k ? 'active' : ''}" aria-pressed="${t === k}" data-action="mType" data-arg="${k}">${MASTER_TYPES[k].label}<span class="n">${state.masters.filter((m) => m.t === k && m.id).length}</span></button>`).join(''));
  show('m-phone', info.phone);
  input('m-name').placeholder = `New ${info.one}`;

  const items = state.masters.filter((m) => m.t === t && m.id).sort((a, b) => a.name.localeCompare(b.name));
  html('m-list', items.length ? items.map((m) => {
    const used = leadsUsing(state.leads, t, m.name);
    const won = used.filter((l) => l.st === 'closed').length;
    const open = used.filter(isActive).length;
    const sub = m.phone ? esc(m.phone) : info.phone ? 'No phone' : '&nbsp;';
    return `<button type="button" class="m-row" data-action="mEdit" data-arg="${esc(m.id)}"><span class="av t-call">${esc(initials(m.name))}</span><span class="lead-info"><span class="lead-name">${esc(m.name)}</span><span class="lead-sub">${sub}</span></span><span class="lead-right"><span class="lead-meta">${used.length} lead${used.length === 1 ? '' : 's'}</span><span class="lead-meta">${open} open, ${won} won</span></span></button>`;
  }).join('') : empty('Nothing here yet', `Add the first ${info.one} above.`));
};

on({
  mType: (b) => {
    state.masterType = (b.dataset.arg || 'acc') as MasterType;
    renderMasters();
  },
  mAdd: async () => {
    const t = state.masterType;
    const name = val('m-name');
    if (!name) { el('m-name').focus(); return; }
    if (state.masters.some((m) => m.t === t && same(m.name, name))) { toast(`${name} is already in the list`); return; }
    try {
      await createMaster({ t, name, phone: MASTER_TYPES[t].phone ? val('m-phone') : '' });
      setVal('m-name', '');
      setVal('m-phone', '');
      toast(`Added ${name}`);
    } catch (e) {
      fail('Could not add. Check your connection.')(e);
    }
  },
});
