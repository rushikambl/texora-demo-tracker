import { el } from '../utils/dom';
import { on } from './actions';

const FOCUSABLE = 'input:not([type=hidden]),select,textarea,button,a[href]';
let opener: Element | null = null;

const sheetOf = (id: string): HTMLElement => el(id).querySelector<HTMLElement>('.sheet') as HTMLElement;

export const openSheet = (id: string): void => {
  const ov = el(id);
  if (ov.classList.contains('open')) return;
  opener = document.activeElement;
  const sheet = sheetOf(id);
  sheet.classList.remove('tried');
  sheet.scrollTop = 0;
  ov.classList.add('open');
  window.setTimeout(() => {
    if (!ov.classList.contains('open')) return;
    const first = sheet.querySelector<HTMLElement>(FOCUSABLE);
    (first || sheet).focus({ preventScroll: true });
  }, 300);
};

export const closeSheet = (id: string): void => {
  const ov = el(id);
  if (!ov.classList.contains('open')) return;
  ov.classList.remove('open');
  const sheet = sheetOf(id);
  sheet.classList.remove('tried');
  sheet.querySelectorAll('[aria-busy]').forEach((b) => b.removeAttribute('aria-busy'));
  if (opener instanceof HTMLElement && document.contains(opener) && !document.querySelector('.overlay.open')) {
    opener.focus({ preventScroll: true });
  }
  // If the opener was inside another (now hidden) sheet, focus would stay trapped in this one; release it.
  const active = document.activeElement;
  if (active instanceof HTMLElement && ov.contains(active)) active.blur();
};

/** Switch from one sheet to another after the first has slid away. */
export const swapSheet = (from: string, to: string, prepare?: () => void): void => {
  closeSheet(from);
  window.setTimeout(() => {
    prepare?.();
    openSheet(to);
  }, 150);
};

/** Mark a form as submitted so invalid fields show their messages; returns false if any are invalid. */
export const validate = (id: string): boolean => {
  const sheet = sheetOf(id);
  sheet.classList.add('tried');
  const bad = sheet.querySelector<HTMLInputElement>('input:invalid');
  if (bad) {
    bad.focus();
    return false;
  }
  return true;
};

/** Block double taps on the primary button while a save is in flight. */
export const busy = (id: string): void => {
  const b = sheetOf(id).querySelector('.btn-primary');
  if (!b) return;
  b.setAttribute('aria-busy', 'true');
  window.setTimeout(() => b.removeAttribute('aria-busy'), 4000);
};

export const startSheets = (): void => {
  document.querySelectorAll<HTMLElement>('.overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => {
      if (e.target === ov) closeSheet(ov.id);
    });
  });
  document.addEventListener('keydown', (e) => {
    const open = [...document.querySelectorAll<HTMLElement>('.overlay.open')].pop();
    if (!open) return;
    if (e.key === 'Escape') {
      closeSheet(open.id);
      return;
    }
    if (e.key !== 'Tab') return;
    const f = [...open.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  on({ close: (b) => closeSheet(b.dataset.arg || '') });
};
