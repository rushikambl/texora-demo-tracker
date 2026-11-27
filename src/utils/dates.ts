/** Local calendar date as YYYY-MM-DD (never UTC, so the day is right in India after midnight). */
export const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const today = (): string => ymd(new Date());

export const addDays = (s: string, n: number): string => {
  const d = new Date(`${s}T00:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export const dayDiff = (s: string, from: string = today()): number =>
  Math.round((new Date(`${s}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);

export const fmt = (s?: string | null): string =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';

export const fmtY = (s?: string | null): string =>
  s ? new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtT = (t?: string | null): string => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const H = Number(h);
  return `${H % 12 || 12}:${m}${H < 12 ? ' am' : ' pm'}`;
};

export const rel = (s: string): string => {
  const n = dayDiff(s);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n < 0 ? `${-n} days ago` : fmt(s);
};

export const ago = (ts: number, now: number = Date.now()): string => {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
