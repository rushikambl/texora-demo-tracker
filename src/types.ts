export type Status = 'call' | 'demo' | 'given' | 'changes' | 'redemo' | 'closed' | 'rejected';
export type Temperature = '' | 'hot' | 'warm' | 'cold';
export type ActivityKind = 'created' | 'note' | 'call' | 'status' | 'followup';

export interface Activity {
  k: ActivityKind;
  x: string;
  t: number;
}

export interface Lead {
  id: string;
  name: string;
  ph: string;
  co?: string;
  city?: string;
  email?: string;
  /** Software the lead is interested in buying. */
  sw?: string;
  src?: string;
  /** Reference giver (who passed us the lead). */
  ref?: string;
  temp?: Temperature;
  val?: number | null;
  st: Status;
  dd?: string | null;
  dt?: string | null;
  dtype?: 'offline' | 'online' | null;
  loc?: string | null;
  pay?: 'cheque' | 'cash' | 'upi' | null;
  amt?: number | null;
  cd?: string | null;
  fu?: string | null;
  createdAt?: number;
  touchedAt?: number;
  demoAt?: number;
  givenAt?: number;
  lostAt?: number;
  wonAt?: number;
  lastCall?: number;
  rejectReason?: string | null;
  rejectNotes?: string | null;
  accountant?: string;
  /** Software the lead uses today, e.g. "Equal + Chandni". */
  curSw?: string;
  biz?: string;
  act?: Activity[];
}

export type LeadData = Omit<Lead, 'id'>;

export type MasterType = 'acc' | 'ref' | 'sw' | 'biz';

export interface Master {
  id?: string;
  t: MasterType;
  name: string;
  phone?: string;
  createdAt?: number;
  pending?: boolean;
}
