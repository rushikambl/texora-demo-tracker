/** Escape text before it goes into an HTML template string. */
export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node as T;
};

export const input = (id: string): HTMLInputElement => el<HTMLInputElement>(id);
export const select = (id: string): HTMLSelectElement => el<HTMLSelectElement>(id);
export const val = (id: string): string => (el<HTMLInputElement>(id).value || '').trim();
export const setVal = (id: string, v: string | number | null | undefined): void => {
  el<HTMLInputElement>(id).value = v == null ? '' : String(v);
};
export const show = (id: string, on: boolean, display = 'block'): void => {
  el(id).style.display = on ? display : 'none';
};
/** Replace an element's markup. Callers pass templates whose dynamic values went through esc(). */
export const html = (id: string, markup: string): void => {
  el(id).innerHTML = markup;
};
