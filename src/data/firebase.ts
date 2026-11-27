import { initializeApp } from 'firebase/app';
import {
  addDoc, arrayUnion, collection, deleteDoc, doc, getFirestore, onSnapshot, updateDoc,
  type FirestoreError,
} from 'firebase/firestore';
import { firebaseConfig } from '../config';
import type { Activity, Lead, LeadData, Master } from '../types';

const db = getFirestore(initializeApp(firebaseConfig));
const LEADS = 'leads';
const MASTERS = 'masters';

export const watchLeads = (onData: (leads: Lead[]) => void, onError: (e: FirestoreError) => void): void => {
  onSnapshot(collection(db, LEADS), (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as LeadData) }))), onError);
};

export const watchMasters = (onData: (m: Master[]) => void, onError: (e: FirestoreError) => void): void => {
  onSnapshot(collection(db, MASTERS), (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Master) }))), onError);
};

export const createLead = async (data: LeadData): Promise<void> => {
  await addDoc(collection(db, LEADS), data);
};

/** Update a lead, mark it as touched, and optionally append one activity entry. */
export const updateLead = async (id: string, data: Partial<LeadData>, entry?: Activity): Promise<void> => {
  const patch: Record<string, unknown> = { ...data, touchedAt: Date.now() };
  if (entry) patch.act = arrayUnion(entry);
  await updateDoc(doc(db, LEADS, id), patch);
};

export const removeLead = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, LEADS, id));
};

export const createMaster = async (m: Omit<Master, 'id'>): Promise<void> => {
  await addDoc(collection(db, MASTERS), { ...m, createdAt: Date.now() });
};

export const updateMaster = async (id: string, data: Partial<Master>): Promise<void> => {
  await updateDoc(doc(db, MASTERS, id), data);
};

export const removeMaster = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, MASTERS, id));
};
