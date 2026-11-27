export const money = (n?: number | string | null): string =>
  `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export const initials = (n?: string): string =>
  (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/** Last 10 digits of a phone number, for duplicate checks. */
export const digits = (p?: string): string => String(p || '').replace(/\D/g, '').slice(-10);

/** Number in the form wa.me expects (adds India's 91 to 10-digit numbers). */
export const waNumber = (p?: string): string => {
  const d = String(p || '').replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

export const same = (a?: string | null, b?: string | null): boolean =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/** "Equal + Chandni" → ["Equal", "Chandni"]. */
export const splitList = (v?: string | null): string[] =>
  String(v || '').split(/\s*\+\s*|\s*,\s*/).map((x) => x.trim()).filter(Boolean);

/** Compare with blanks always last. */
export const blankLast = (x?: string | null, y?: string | null): number =>
  Number(!x) - Number(!y) || String(x || '').localeCompare(String(y || ''));

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
