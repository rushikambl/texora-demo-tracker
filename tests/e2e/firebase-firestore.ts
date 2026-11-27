// In-memory stand-in for Firestore used by the e2e build. Seeds a few leads so every screen has data.
type Doc = Record<string, unknown>;
type Snap = { docs: { id: string; data: () => Doc }[] };
export type FirestoreError = { code: string };

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
const DAY = 86400000;
const NOW = Date.now();

const db: Record<string, Record<string, Doc>> = {
  leads: {
    a: { name: 'Ankitbhai', co: 'Aarohi Group', ph: '9825351777', accountant: 'Pintu', curSw: 'Equal + Chandni', biz: 'Rapier', src: 'Reference', ref: 'Alpeshbhai', temp: 'hot', val: 60000, st: 'demo', dd: day(0), dt: '11:30', dtype: 'offline', loc: 'Ring Road office', createdAt: NOW - 3 * DAY, touchedAt: NOW - DAY, act: [{ k: 'created', x: 'Lead added from Reference (Alpeshbhai)', t: NOW - 3 * DAY }] },
    b: { name: 'Vibhorbhai', co: 'Aarvi Group', ph: '9825572748', accountant: 'Hardik', curSw: 'Equal', biz: 'Rapier', src: 'Reference', ref: 'Alpeshbhai', temp: 'warm', st: 'call', fu: day(-2), createdAt: NOW - 5 * DAY, touchedAt: NOW - 3 * DAY, act: [] },
    c: { name: 'Satishbhai', co: 'Anjanisuta Creation', ph: '9825111133', accountant: 'Vicky', biz: 'Airjet', src: 'Reference', ref: 'Alpeshbhai', temp: 'warm', st: 'call', fu: day(0), createdAt: NOW - 9 * DAY, touchedAt: NOW - 9 * DAY, act: [] },
    d: { name: 'Jitubhai', co: 'ARJ Group', ph: '9227121322', accountant: 'Ankit', curSw: 'Syspro + Empire', biz: 'Rapier', src: 'Exhibition', st: 'given', givenAt: NOW - 2 * DAY, fu: day(2), createdAt: NOW - 12 * DAY, touchedAt: NOW - 2 * DAY, act: [] },
    e: { name: 'Vipul Mehta', co: 'Mehta Jari', ph: '9427788990', src: 'Reference', st: 'closed', pay: 'cash', amt: 25000, cd: day(-345), createdAt: NOW - 400 * DAY, act: [] },
    f: { name: 'Raj Gupta', co: 'Gupta Yarns', ph: '9822222222', src: 'Cold call', st: 'rejected', rejectReason: 'Too expensive', lostAt: NOW - 2 * DAY, createdAt: NOW - 6 * DAY, act: [] },
  },
  masters: {},
};
const listeners: Record<string, ((s: Snap) => void)[]> = {};
let counter = 0;

const emit = (c: string) => {
  const snap: Snap = { docs: Object.entries(db[c]).map(([id, d]) => ({ id, data: () => structuredClone(d) })) };
  (listeners[c] || []).forEach((fn) => setTimeout(() => fn(snap), 5));
};

export const getFirestore = (): object => ({});
export const initializeFirestore = (): object => ({});
export const persistentLocalCache = (o?: unknown): unknown => o;
export const persistentMultipleTabManager = (): object => ({});
export const collection = (_db: unknown, name: string): string => name;
export const doc = (_db: unknown, c: string, id: string): [string, string] => [c, id];
export const arrayUnion = (x: unknown) => ({ __union: x });
export const onSnapshot = (c: string, fn: (s: Snap) => void): void => { (listeners[c] ||= []).push(fn); emit(c); };
export const addDoc = async (c: string, data: Doc): Promise<void> => { db[c][`n${++counter}`] = structuredClone(data); emit(c); };
export const updateDoc = async ([c, id]: [string, string], data: Doc): Promise<void> => {
  const d = db[c][id];
  Object.entries(data).forEach(([k, v]) => {
    const u = v as { __union?: unknown } | null;
    d[k] = u && typeof u === 'object' && '__union' in u ? [...((d[k] as unknown[]) || []), u.__union] : v;
  });
  emit(c);
};
export const deleteDoc = async ([c, id]: [string, string]): Promise<void> => { delete db[c][id]; emit(c); };
