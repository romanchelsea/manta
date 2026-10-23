'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SyncState } from '@/lib/db';
import { filterRows, timeBounds } from '@/lib/filters';
import { useSettings } from '@/lib/settings';
import type { AccountId, HeroInfo, ItemInfo, MatchRecord, MatchSummary } from '@/lib/types';

const NO_SUMMARIES: MatchSummary[] = [];
const NO_RECORDS: MatchRecord[] = [];

export function useSummaries(): MatchSummary[] {
  const { settings } = useSettings();
  const { selected, range } = settings;
  const key = JSON.stringify([selected, range]);
  return (
    useLiveQuery(async () => {
      if (!selected.length) return NO_SUMMARIES;
      const [from, to] = timeBounds(range, Date.now() / 1000);
      const rows = await db.summaries.where('accountId').anyOf(selected).toArray();
      return filterRows(rows, { selected: new Set(selected), from, to });
    }, [key]) ?? NO_SUMMARIES
  );
}

export function useRecords(): MatchRecord[] {
  const { settings } = useSettings();
  const { selected } = settings;
  return (
    useLiveQuery(async () => {
      if (!selected.length) return NO_RECORDS;
      const rows = await db.records.where('accountId').anyOf(selected).toArray();
      return rows.sort((a, b) => b.startTime - a.startTime);
    }, [selected.join(',')]) ?? NO_RECORDS
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

const PALETTE = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

export function accountColor(index: number): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}
