'use client';
import { useSyncExternalStore } from 'react';
import { parseAccountId } from '@/lib/ids';
import { DEFAULT_RANGE, type TimeRange } from '@/lib/filters';
import type { AccountId } from '@/lib/types';

export interface Settings {
  accounts: AccountId[];
  selected: AccountId[];
  apiKey: string;
  range: TimeRange;
}

const K = { accounts: 'd2web.accounts', selected: 'd2web.selected', apiKey: 'd2web.apiKey', range: 'd2web.range' };

const DEFAULTS: Settings = { accounts: [], selected: [], apiKey: '', range: DEFAULT_RANGE };

function readJson<T>(key: string, ok: (v: unknown) => boolean, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return ok(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

const isStrArray = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isRange = (v: unknown) => {
  const r = v as TimeRange | null;
  if (!r || typeof r !== 'object') return false;
  if (r.kind === 'preset') return [7, 30, 90, 180, 365].includes(r.days);
  return r.kind === 'custom' && typeof r.from === 'string' && typeof r.to === 'string';
};

export function loadSettings(): Settings {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  let apiKey = '';
  try {
    apiKey = localStorage.getItem(K.apiKey) ?? '';
  } catch {
    /* ignore */
  }
  const accounts = readJson<AccountId[]>(K.accounts, isStrArray, []);
  const selected = readJson<AccountId[]>(K.selected, isStrArray, []).filter((a) => accounts.includes(a));
  return { accounts, selected, apiKey, range: readJson<TimeRange>(K.range, isRange, DEFAULT_RANGE) };
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(K.accounts, JSON.stringify(s.accounts));
    localStorage.setItem(K.selected, JSON.stringify(s.selected));
    localStorage.setItem(K.apiKey, s.apiKey);
    localStorage.setItem(K.range, JSON.stringify(s.range));
  } catch {
    /* storage unavailable */
  }
}

export function addAccounts(
  s: Settings,
  inputs: string[],
): { settings: Settings; added: AccountId[]; invalid: string[] } {
  const added: AccountId[] = [];
  const invalid: string[] = [];
  const known = new Set(s.accounts);
  for (const raw of inputs) {
    const line = raw.trim();
    if (!line) continue;
    // Vanity URLs (/id/name) can't be resolved without the Steam API.
    const id = /steamcommunity\.com\/id\//i.test(line) ? null : parseAccountId(line);
    if (!id) {
      invalid.push(line);
      continue;
    }
    if (known.has(id)) continue;
    known.add(id);
    added.push(id);
  }
  return {
    settings: { ...s, accounts: [...s.accounts, ...added], selected: [...s.selected, ...added] },
    added,
    invalid,
  };
}

// --- shared store ---
let snapshot: Settings | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Settings {
  if (!snapshot) snapshot = loadSettings();
  return snapshot;
}
const getServerSnapshot = (): Settings => DEFAULTS;

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateSettings(next: Settings): void {
  snapshot = next;
  saveSettings(next);
  listeners.forEach((l) => l());
}

/** Test helper: drop the cached snapshot so the next read hits localStorage. */
export function resetSettingsCache(): void {
  snapshot = null;
}

export function useSettings(): { settings: Settings; update(next: Settings): void } {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { settings, update: updateSettings };
}
