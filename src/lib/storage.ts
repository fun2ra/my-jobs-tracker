import type { GoogleSettings } from './google';
import type { EmailEvent } from './types';

/**
 * Everything is kept in this browser only: emails in IndexedDB, settings in localStorage.
 * Storage can be unavailable (private windows, blocked site data), so every call tolerates failure.
 */

const DB_NAME = 'jobs-tracker';
const STORE = 'data';
const SETTINGS_KEY = 'jobs-tracker:settings';

export interface SyncInfo {
  at: string;
  emails: number;
  spreadsheetUrl?: string;
  warnings?: string[];
}

interface Saved {
  events: (Omit<EmailEvent, 'date'> & { date: string })[];
  sync?: SyncInfo;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadData(): Promise<{ events: EmailEvent[]; sync?: SyncInfo }> {
  try {
    const saved = await withStore<Saved | undefined>('readonly', store => store.get('current'));
    return {
      events: (saved?.events ?? []).map(e => ({ ...e, date: new Date(e.date) })),
      sync: saved?.sync,
    };
  } catch {
    return { events: [] };
  }
}

export async function saveData(events: EmailEvent[], sync?: SyncInfo): Promise<boolean> {
  const saved: Saved = { events: events.map(e => ({ ...e, date: e.date.toISOString() })), sync };
  try {
    await withStore('readwrite', store => store.put(saved, 'current'));
    return true;
  } catch {
    return false;
  }
}

export async function clearData(): Promise<void> {
  try {
    await withStore('readwrite', store => store.clear());
  } catch {
    // nothing stored
  }
}

const EMPTY_SETTINGS: GoogleSettings = { clientId: '', scriptId: '', allowedEmail: '' };

export function loadSettings(): GoogleSettings {
  try {
    return { ...EMPTY_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export function saveSettings(settings: GoogleSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // kept for this session only
  }
}
