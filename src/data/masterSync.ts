import { missingMasters } from '../domain/masters';
import { state } from '../state';
import type { MasterType } from '../types';
import { same } from '../utils/format';
import { createMaster } from './firebase';

/** Add a master entry if it isn't in the list yet (used when the lead form introduces a new name). */
export const ensureMaster = async (t: MasterType, name?: string | null): Promise<void> => {
  const n = String(name || '').trim();
  if (!n || state.masters.some((m) => m.t === t && same(m.name, n))) return;
  state.masters.push({ t, name: n, pending: true });
  await createMaster({ t, name: n, phone: '' });
};

let seeded = false;

/** Once per session, after both lists load, add any names that leads use but masters don't have. */
export const seedMasters = async (): Promise<void> => {
  if (seeded || !state.leadsLoaded || !state.mastersLoaded) return;
  seeded = true;
  for (const [t, n] of missingMasters(state.leads, state.masters)) {
    await ensureMaster(t, n).catch((e) => console.error('Could not add master', t, n, e));
  }
};
