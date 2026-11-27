import { el } from '../utils/dom';

let timer: number | undefined;

export const toast = (message: string): void => {
  const t = el('toast');
  t.textContent = message;
  t.classList.add('show');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => t.classList.remove('show'), 2400);
};

/** Log the real error for debugging and show the person a plain message. */
export const fail = (message: string) => (err: unknown): void => {
  console.error(err);
  toast(message);
};
