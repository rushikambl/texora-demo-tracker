import { on } from '../ui/actions';
import { el } from '../utils/dom';

export type Tab = 'today' | 'leads' | 'agenda' | 'reports' | 'clients' | 'masters';

const listeners: ((tab: Tab) => void)[] = [];
export const onTabChange = (fn: (tab: Tab) => void): void => { listeners.push(fn); };

export const go = (tab: Tab): void => {
  document.querySelectorAll<HTMLElement>('.panel').forEach((p) => p.classList.toggle('active', p.id === `p-${tab}`));
  document.querySelectorAll<HTMLElement>('.tab').forEach((b) => {
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
