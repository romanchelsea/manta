import type { D2Db, SyncState } from '@/lib/db';
import type { OpenDotaClient } from '@/lib/opendota';
import { RECORD_FIELDS, SUMMARY_FIELDS, toHeroes, toItems, toProfile, toRecord, toSummary } from '@/lib/normalize';
import type { AccountId, HeroInfo, ItemInfo } from '@/lib/types';

export const SYNC_TTL_MS = 6 * 3600 * 1000;
export const SUMMARY_DAYS = 365;
export const DETAIL_DAYS = 90;
export const DAY = 86400;
const CONSTANTS_TTL_MS = 7 * 24 * 3600 * 1000;
export const PRIVATE_MESSAGE =
  'No public match data. This account may have "Expose Public Match Data" turned off in Dota 2. Private accounts are coming in a later version.';

export type SyncStage = 'profile' | 'records' | 'summaries' | 'done';

export async function syncAccount(
  accountId: AccountId,
  deps: { client: OpenDotaClient; db: D2Db; now?: () => number; force?: boolean; onStage?: (s: SyncStage) => void },
): Promise<SyncState> {
  const { client, db, force } = deps;
  const now = (deps.now ?? Date.now)();
  const nowSec = now / 1000;
  const prev = await db.syncState.get(accountId);
  if (!force && prev?.status === 'ok' && now - prev.lastSyncAt < SYNC_TTL_MS) return prev;

  try {
    deps.onStage?.('profile');
    const profile = toProfile(await client.get<unknown>(`/players/${accountId}`), accountId);
    if (!profile) {
      const st: SyncState = { accountId, lastSyncAt: now, status: 'private', error: PRIVATE_MESSAGE, profile: null };
      await db.syncState.put(st);
      deps.onStage?.('done');
      return st;
    }

    const path = `/players/${accountId}/matches`;
    deps.onStage?.('records');
    const newestRec = await db.records.where('accountId').equals(accountId).reverse().sortBy('startTime').then((r) => r[0]);
    const recParams: Record<string, string | number | string[]> = { significant: 0, project: RECORD_FIELDS };
    if (newestRec) recParams.date = Math.ceil((nowSec - newestRec.startTime) / DAY) + 1;
    const rawRecords = await client.get<Parameters<typeof toRecord>[0][]>(path, recParams);

    deps.onStage?.('summaries');
    const newestSum = await db.summaries.where('accountId').equals(accountId).reverse().sortBy('startTime').then((r) => r[0]);
    const date = newestSum ? Math.min(SUMMARY_DAYS, Math.ceil((nowSec - newestSum.startTime) / DAY) + 1) : SUMMARY_DAYS;
    const rawSummaries = await client.get<Parameters<typeof toSummary>[0][]>(path, {
      significant: 0, project: SUMMARY_FIELDS, date,
    });

    const records = rawRecords.map((m) => toRecord(m, accountId));
    const summaries = rawSummaries.map((m) => toSummary(m, accountId));
    await db.records.bulkPut(records);
    await db.summaries.bulkPut(summaries);
    await db.summaries.where('startTime').below(nowSec - SUMMARY_DAYS * DAY).delete();
    await db.details.where('startTime').below(nowSec - DETAIL_DAYS * DAY).delete();

    const total = await db.records.where('accountId').equals(accountId).count();
    const st: SyncState =
      total === 0
        ? { accountId, lastSyncAt: now, status: 'private', error: PRIVATE_MESSAGE, profile }
        : { accountId, lastSyncAt: now, status: 'ok', profile };
    await db.syncState.put(st);
    deps.onStage?.('done');
    return st;
  } catch (e) {
    const st: SyncState = {
      accountId,
      lastSyncAt: prev?.lastSyncAt ?? 0,
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
      profile: prev?.profile ?? null,
    };
    await db.syncState.put(st);
    return st;
  }
}

export async function removeAccountData(db: D2Db, accountId: AccountId): Promise<void> {
  await db.transaction('rw', db.records, db.summaries, db.syncState, async () => {
    await db.records.where('accountId').equals(accountId).delete();
    await db.summaries.where('accountId').equals(accountId).delete();
    await db.syncState.delete(accountId);
  });
}

export async function loadConstants(deps: {
  client: OpenDotaClient;
  db: D2Db;
  now?: () => number;
}): Promise<{ heroes: Record<number, HeroInfo>; items: Record<number, ItemInfo> }> {
  const { client, db } = deps;
  const now = (deps.now ?? Date.now)();
  async function load<T>(key: 'heroes' | 'items', fetcher: () => Promise<T>): Promise<T> {
    const row = await db.constants.get(key);
    if (row && now - row.fetchedAt < CONSTANTS_TTL_MS) return row.data as T;
    const data = await fetcher();
    await db.constants.put({ key, data, fetchedAt: now });
    return data;
  }
  const heroes = await load('heroes', async () => toHeroes(await client.get<unknown[]>('/heroes') as never[]));
  const items = await load('items', async () => toItems(await client.get<Record<string, unknown>>('/constants/items')));
  return { heroes, items };
}
