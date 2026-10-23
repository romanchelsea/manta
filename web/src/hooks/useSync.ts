'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncState } from '@/lib/db';
import { createOpenDotaClient, type OpenDotaClient } from '@/lib/opendota';
import { loadConstants, removeAccountData, syncAccount, type SyncStage } from '@/lib/sync';
import { loadSettings } from '@/lib/settings';
import type { AccountId } from '@/lib/types';

// Module-level progress store so every component sees the same stages.
let stages: Record<AccountId, SyncStage | undefined> = {};
let running = false;
let current: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const EMPTY = {};
const getStages = () => stages;
const getRunning = () => running;

let clientKey: string | null = null;
let client: OpenDotaClient | null = null;
function getClient(apiKey: string): OpenDotaClient {
  if (!client || clientKey !== apiKey) {
    client = createOpenDotaClient({ apiKey: apiKey || undefined });
    clientKey = apiKey;
  }
  return client;
}

export async function runSync(force: boolean): Promise<void> {
  // Re-read settings so accounts added just now are included.
  const { accounts, apiKey } = loadSettings();
  const c = getClient(apiKey);
  running = true;
  emit();
  try {
    try {
      await loadConstants({ client: c, db });
    } catch {
      /* constants are retried on the next sync */
    }
    const stillTracked = (id: AccountId) => loadSettings().accounts.includes(id);
    for (const id of accounts) {
      // Skip accounts removed while earlier accounts were syncing.
      if (!stillTracked(id)) continue;
      await syncAccount(id, {
        client: c,
        db,
        force,
        onStage: (s) => {
          stages = { ...stages, [id]: s === 'done' ? undefined : s };
          emit();
        },
      });
      // Removed mid-sync: syncAccount may have written rows back after removeAccountData ran.
      if (!stillTracked(id)) await removeAccountData(db, id);
      stages = { ...stages, [id]: undefined };
      emit();
    }
  } finally {
    running = false;
    emit();
  }
}

/** Serialise calls: a sync requested while one runs waits for it, then runs. */
function queueSync(force: boolean): Promise<void> {
  const next = (current ?? Promise.resolve()).catch(() => {}).then(() => runSync(force));
  current = next.finally(() => {
    if (current === next) current = null;
  });
  return next;
}

export function useSync(): {
  syncAll(force: boolean): Promise<void>;
  running: boolean;
  states: Record<AccountId, SyncState | undefined>;
  stage: Record<AccountId, SyncStage | undefined>;
} {
  const stage = useSyncExternalStore(subscribe, getStages, () => EMPTY);
  const isRunning = useSyncExternalStore(subscribe, getRunning, () => false);
  const rows = useLiveQuery(() => db.syncState.toArray(), []);
  const states: Record<AccountId, SyncState | undefined> = {};
  for (const r of rows ?? []) states[r.accountId] = r;

  const mutation = useMutation({ mutationFn: (force: boolean) => queueSync(force) });
  const { mutateAsync } = mutation;
  const syncAll = useCallback((force: boolean) => mutateAsync(force), [mutateAsync]);

  return { syncAll, running: isRunning, states, stage };
}
