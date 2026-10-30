'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncState } from '@/lib/db';
import { filterRows, timeBounds } from '@/lib/filters';
import { useSettings } from '@/lib/settings';
import type { AccountId, HeroInfo, ItemInfo, MatchRecord, MatchSummary } from '@/lib/types';

const NO_SUMMARIES: MatchSummary[] = [];
const NO_RECORDS: MatchRecord[] = [];

/** `undefined` while the first IndexedDB read is in flight. */
export function useSummaries(): MatchSummary[] | undefined {
  const { settings } = useSettings();
  const { selected, range } = settings;
  const key = JSON.stringify([selected, range]);
  return (
    useLiveQuery(async () => {
      if (!selected.length) return NO_SUMMARIES;
      const [from, to] = timeBounds(range, Date.now() / 1000);
      const rows = await db.summaries.where('accountId').anyOf(selected).toArray();
      return filterRows(rows, { selected: new Set(selected), from, to });
    }, [key])
  );
}

/** `undefined` while the first IndexedDB read is in flight. */
export function useRecords(): MatchRecord[] | undefined {
  const { settings } = useSettings();
  const { selected } = settings;
  return (
    useLiveQuery(async () => {
      if (!selected.length) return NO_RECORDS;
      const rows = await db.records.where('accountId').anyOf(selected).toArray();
      return rows.sort((a, b) => b.startTime - a.startTime);
    }, [selected.join(',')])
  );
}

export function useProfiles(): Record<AccountId, SyncState> {
  return (
    useLiveQuery(async () => {
      const out: Record<AccountId, SyncState> = {};
      for (const s of await db.syncState.toArray()) out[s.accountId] = s;
      return out;
    }, []) ?? {}
  );
}

export function useConstants():
  | { heroes: Record<number, HeroInfo>; items: Record<number, ItemInfo> }
  | undefined {
  return useLiveQuery(async () => {
    const [h, i] = await Promise.all([db.constants.get('heroes'), db.constants.get('items')]);
    if (!h || !i) return undefined;
    return { heroes: h.data as Record<number, HeroInfo>, items: i.data as Record<number, ItemInfo> };
  }, []);
}

const PALETTE = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#84cc16'];

export function accountColor(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
