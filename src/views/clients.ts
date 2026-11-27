import { maintenanceDays } from '../domain/leads';
import { state } from '../state';
import { empty, leadRow } from '../ui/components';
import { fmt } from '../utils/dates';
import { el, esc, html } from '../utils/dom';
import { money } from '../utils/format';

const PAY_LABEL: Record<string, string> = { cash: 'Cash', cheque: 'Cheque', upi: 'UPI' };

export const renderClients = (): void => {
  const won = state.leads.filter((l) => l.st === 'closed').sort((a, b) => (b.cd || '').localeCompare(a.cd || ''));
  el('c-won').textContent = won.length ? `${won.length}, ${money(won.reduce((s, l) => s + (Number(l.amt) || 0), 0))}` : '';
  html('l-won', won.length ? won.map((l) => {
    const d = l.pay === 'cash' ? maintenanceDays(l) : null;
    const meta = d == null ? `${PAY_LABEL[l.pay || 'cheque']}, ${fmt(l.cd)}` : d < 0 ? 'Maintenance overdue' : `Maintenance in ${d}d`;
    return leadRow(l, `<span class="tag t-closed">${money(l.amt)}</span><span class="lead-meta ${d != null && d < 0 ? 'over' : ''}">${meta}</span>`);
  }).join('') : empty('No clients yet', 'Leads you mark as Won appear here.'));

  const rejected = state.leads.filter((l) => l.st === 'rejected').sort((a, b) => (b.lostAt || 0) - (a.lostAt || 0));
  el('c-rej').textContent = rejected.length ? String(rejected.length) : '';
  html('l-rej', rejected.length
    ? rejected.map((l) => leadRow(l, `<span class="tag t-rejected">Rejected</span><span class="lead-meta">${esc(l.rejectReason || '')}</span>`)).join('')
    : empty('No rejected leads', ''));
};
