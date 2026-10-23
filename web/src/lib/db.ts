import Dexie, { type Table } from 'dexie';
import type { AccountId, AccountProfile, MatchDetail, MatchRecord, MatchSummary } from '@/lib/types';

export interface SyncState {
  accountId: AccountId;
  lastSyncAt: number; // ms, 0 = never
  status: 'ok' | 'private' | 'error';
  error?: string;
  profile: AccountProfile | null;
}
export interface StoredDetail extends MatchDetail {
  fetchedAt: number;
}

export class D2Db extends Dexie {
  records!: Table<MatchRecord, string>;
  summaries!: Table<MatchSummary, string>;
  details!: Table<StoredDetail, number>;
  syncState!: Table<SyncState, string>;
  constants!: Table<{ key: 'heroes' | 'items'; data: unknown; fetchedAt: number }, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      records: 'key, accountId, startTime, [accountId+startTime]',
      summaries: 'key, accountId, startTime, [accountId+startTime]',
      details: 'matchId, startTime',
      syncState: 'accountId',
      constants: 'key',
    });
  }
}

export function createDb(name = 'd2web'): D2Db {
  return new D2Db(name);
}

export const db: D2Db = createDb();
