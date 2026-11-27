import type { Period } from './domain/reports';
import type { Lead, Master, MasterType } from './types';

/** Single in-memory store; Firestore listeners fill it and views read from it. */
export const state = {
  leads: [] as Lead[],
  masters: [] as Master[],
  leadsLoaded: false,
  mastersLoaded: false,
  statusFilter: 'active',
  query: '',
  period: 'month' as Period,
  masterType: 'acc' as MasterType,
  openLeadId: null as string | null,
};

export const findLead = (id: string): Lead | undefined => state.leads.find((l) => l.id === id);
