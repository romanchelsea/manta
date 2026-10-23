import { describe, expect, it } from 'vitest';
import { createDb } from '@/lib/db';
import { DAY, PRIVATE_MESSAGE, SYNC_TTL_MS, removeAccountData, syncAccount } from '@/lib/sync';
import { OpenDotaError, RATE_LIMIT_MESSAGE, type OpenDotaClient, type Params } from '@/lib/opendota';
import { RECORD_FIELDS, SUMMARY_FIELDS } from '@/lib/normalize';

const NOW = 1_800_000_000_000;
const sec = NOW / 1000;

function row(id: number, start: number) {
  return {
    match_id: id, player_slot: 0, radiant_win: true, start_time: start, duration: 1800,
    hero_id: 1, kills: 1, deaths: 1, assists: 1, game_mode: 22, lobby_type: 7,
  };
}

function fakeClient(opts: { profile?: unknown; records?: unknown[]; summaries?: unknown[]; failSummaries?: boolean } = {}) {
  const calls: { path: string; params?: Params }[] = [];
  const client: OpenDotaClient = {
    async get<T>(path: string, params?: Params): Promise<T> {
      calls.push({ path, params });
      if (path === '/players/1') return (opts.profile ?? { profile: { personaname: 'A' }, rank_tier: 50 }) as T;
      if (path === '/players/1/matches') {
        const project = params?.project as string[];
        if (project.includes('hero_id')) {
          if (opts.failSummaries) throw new OpenDotaError(429, RATE_LIMIT_MESSAGE);
          return (opts.summaries ?? [row(1, sec - 100)]) as T;
        }
        return (opts.records ?? [row(1, sec - 100)]) as T;
      }
      throw new Error('unexpected ' + path);
    },
  };
  return { client, calls };
}

const fresh = () => createDb('test-' + crypto.randomUUID());

describe('syncAccount', () => {
  it('first sync', async () => {
    const db = fresh();
    const { client, calls } = fakeClient();
    const st = await syncAccount('1', { client, db, now: () => NOW });
    const rec = calls.find((c) => c.path === '/players/1/matches' && !(c.params!.project as string[]).includes('hero_id'))!;
    expect(rec.params!.date).toBeUndefined();
    expect(rec.params!.project).toContain('duration');
    expect(rec.params!.project).toEqual(RECORD_FIELDS);
    const sum = calls.find((c) => (c.params?.project as string[] | undefined)?.includes('hero_id'))!;
    expect(sum.params!.date).toBe(365);
    expect(sum.params!.project).toEqual(SUMMARY_FIELDS);
    expect(await db.records.count()).toBe(1);
    expect(await db.summaries.count()).toBe(1);
    expect(st.status).toBe('ok');
    expect(st.lastSyncAt).toBe(NOW);
    expect(st.profile?.name).toBe('A');
  });

  it('fresh skip', async () => {
    const db = fresh();
    const { client, calls } = fakeClient();
    await syncAccount('1', { client, db, now: () => NOW });
    const n = calls.length;
    const st = await syncAccount('1', { client, db, now: () => NOW + 3600_000 });
    expect(calls.length).toBe(n);
    expect(st.lastSyncAt).toBe(NOW);
    expect(SYNC_TTL_MS).toBe(6 * 3600_000);
  });

  it('incremental', async () => {
    const db = fresh();
    const later = NOW + 7 * 3600_000;
    const { client, calls } = fakeClient({ records: [row(1, later / 1000 - 2 * DAY)], summaries: [row(1, later / 1000 - 2 * DAY)] });
    await syncAccount('1', { client, db, now: () => NOW });
    calls.length = 0;
    await syncAccount('1', { client, db, now: () => later });
    const rec = calls.find((c) => c.path === '/players/1/matches' && !(c.params!.project as string[]).includes('hero_id'))!;
    expect(rec.params!.date).toBe(3);
  });

  it('prune', async () => {
    const db = fresh();
    const mk = (id: number, days: number) => ({
      key: `1:${id}`, accountId: '1', matchId: id, startTime: sec - days * DAY, duration: 1, win: true,
    });
    await db.summaries.bulkPut([mk(5, 400) as never, mk(2, 10) as never]);
    const det = (id: number, days: number) => ({ matchId: id, startTime: sec - days * DAY, fetchedAt: 0 }) as never;
    await db.details.bulkPut([det(10, 100), det(11, 30)]);
    const { client } = fakeClient();
    await syncAccount('1', { client, db, now: () => NOW });
    expect(await db.summaries.get('1:5')).toBeUndefined();
    expect(await db.summaries.get('1:2')).toBeDefined();
    expect(await db.details.get(10)).toBeUndefined();
    expect(await db.details.get(11)).toBeDefined();
  });

  it('private account', async () => {
    const db = fresh();
    const { client, calls } = fakeClient({ profile: {} });
    const st = await syncAccount('1', { client, db, now: () => NOW });
    expect(st.status).toBe('private');
    expect(st.error).toBe(PRIVATE_MESSAGE);
    expect(st.profile).toBeNull();
    expect(st.lastSyncAt).toBe(NOW);
    expect(calls.length).toBe(1);
  });

  it('failed sync keeps data', async () => {
    const db = fresh();
    await syncAccount('1', { client: fakeClient().client, db, now: () => NOW });
    const { client } = fakeClient({ failSummaries: true, records: [row(1, sec - 50), row(2, sec - 40)] });
    const st = await syncAccount('1', { client, db, now: () => NOW + 10 * 3600_000, force: true });
    expect(st.status).toBe('error');
    expect(st.error).toBe(RATE_LIMIT_MESSAGE);
    expect(st.lastSyncAt).toBe(NOW);
    expect(await db.records.count()).toBe(1);
    expect(await db.summaries.count()).toBe(1);
  });
});

describe('removeAccountData', () => {
  it('removes only that account', async () => {
    const db = fresh();
    const mk = (a: string) => ({ key: `${a}:1`, accountId: a, matchId: 1, startTime: 1, duration: 1, win: true });
    await db.records.bulkPut([mk('1'), mk('2')]);
    await db.summaries.bulkPut([mk('1') as never, mk('2') as never]);
    await db.syncState.bulkPut([
      { accountId: '1', lastSyncAt: 1, status: 'ok', profile: null },
      { accountId: '2', lastSyncAt: 1, status: 'ok', profile: null },
    ]);
    await removeAccountData(db, '1');
    expect(await db.records.count()).toBe(1);
    expect(await db.summaries.count()).toBe(1);
    expect(await db.syncState.count()).toBe(1);
    expect(await db.records.get('2:1')).toBeDefined();
  });
});
