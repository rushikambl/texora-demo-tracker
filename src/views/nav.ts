import { on } from '../ui/actions';
import { el } from '../utils/dom';

export type Tab = 'today' | 'leads' | 'agenda' | 'reports' | 'clients' | 'masters';

export const TAB_TITLE: Record<Tab, string> = {
  today: 'Today', leads: 'Leads', agenda: 'Agenda', reports: 'Reports', clients: 'Clients', masters: 'Masters',
};

let current: Tab = 'today';
export const currentTab = (): Tab => current;

const listeners: ((tab: Tab) => void)[] = [];
export const onTabChange = (fn: (tab: Tab) => void): void => { listeners.push(fn); };

export const go = (tab: Tab): void => {
  document.querySelectorAll<HTMLElement>('.panel').forEach((p) => p.classList.toggle('active', p.id === `p-${tab}`));
  current = tab;
  el('pg-title').textContent = TAB_TITLE[tab];
  document.title = `${TAB_TITLE[tab]} · Texora Demo Tracker`;
  document.querySelectorAll<HTMLElement>('.tab, .sb-item').forEach((b) => {
    const active = b.dataset.arg === tab;
    b.classList.toggle('active', active);
    if (active) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  el('fab').classList.toggle('hide', tab === 'reports' || tab === 'clients' || tab === 'masters');
  el('mastersBtn').classList.toggle('on', tab === 'masters');
  window.scrollTo({ top: 0 });
  listeners.forEach((fn) => fn(tab));
};

on({ go: (b) => go((b.dataset.arg || 'today') as Tab) });
