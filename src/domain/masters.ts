import type { Lead, Master, MasterType } from '../types';
import { same, splitList } from '../utils/format';

export interface MasterInfo {
  label: string;
  one: string;
  field: 'accountant' | 'ref' | 'curSw' | 'biz';
  phone: boolean;
}

export const MASTER_TYPES: Record<MasterType, MasterInfo> = {
  acc: { label: 'Accountants', one: 'accountant', field: 'accountant', phone: true },
  ref: { label: 'Reference givers', one: 'reference giver', field: 'ref', phone: true },
  sw: { label: 'Software', one: 'software', field: 'curSw', phone: false },
  biz: { label: 'Business types', one: 'business type', field: 'biz', phone: false },
};

export const MASTER_ORDER: MasterType[] = ['acc', 'ref', 'sw', 'biz'];
export const DEFAULT_BUSINESS = ['Rapier', 'Airjet', 'Knitting', 'Waterjet'];

export const namesOf = (masters: Master[], t: MasterType): string[] =>
  masters.filter((m) => m.t === t).map((m) => m.name).sort((a, b) => a.localeCompare(b));

export const leadsUsing = (leads: Lead[], t: MasterType, name: string): Lead[] =>
  leads.filter((l) =>
    t === 'sw' ? splitList(l.curSw).some((x) => same(x, name)) : same(l[MASTER_TYPES[t].field], name),
  );

/** Field value for a lead after renaming (or removing, when to is '') a master entry. */
export const renamedValue = (l: Lead, t: MasterType, from: string, to: string): string => {
  if (t !== 'sw') return to;
  return splitList(l.curSw)
    .map((x) => (same(x, from) ? to : x))
    .filter(Boolean)
    .join(' + ');
};

/** Master entries that leads already use but the masters list doesn't have yet. */
export const missingMasters = (leads: Lead[], masters: Master[]): [MasterType, string][] => {
  const want: [MasterType, string][] = [];
  leads.forEach((l) => {
    if (l.accountant) want.push(['acc', l.accountant]);
    if (l.ref) want.push(['ref', l.ref]);
    if (l.biz) want.push(['biz', l.biz]);
    splitList(l.curSw).forEach((x) => want.push(['sw', x]));
  });
  if (!masters.some((m) => m.t === 'biz')) DEFAULT_BUSINESS.forEach((x) => want.push(['biz', x]));
  const out: [MasterType, string][] = [];
  want.forEach(([t, n]) => {
    const name = n.trim();
    if (!name) return;
    const known = masters.some((m) => m.t === t && same(m.name, name)) || out.some(([ot, on]) => ot === t && same(on, name));
    if (!known) out.push([t, name]);
  });
  return out;
};
