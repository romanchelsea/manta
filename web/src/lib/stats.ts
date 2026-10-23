import type { AccountId, MatchSummary, Position } from '@/lib/types';
import { kda } from '@/lib/dota';

export interface Summary {
  games: number; wins: number; winRate: number; kda: number;
  avgKills: number; avgDeaths: number; avgAssists: number;
  avgGpm: number | null; avgXpm: number | null; avgDuration: number;
}

export function summarize(rows: MatchSummary[]): Summary {
  const n = rows.length;
  let wins = 0, k = 0, d = 0, a = 0, dur = 0, gpm = 0, xpm = 0, gn = 0;
  for (const m of rows) {
    if (m.win) wins++;
    k += m.kills; d += m.deaths; a += m.assists; dur += m.duration;
    if (m.gpm != null) { gpm += m.gpm; xpm += m.xpm ?? 0; gn++; }
  }
  return {
    games: n, wins, winRate: n ? wins / n : 0, kda: kda(k, d, a),
    avgKills: n ? k / n : 0, avgDeaths: n ? d / n : 0, avgAssists: n ? a / n : 0,
    avgGpm: gn ? gpm / gn : null, avgXpm: gn ? xpm / gn : null,
    avgDuration: n ? dur / n : 0,
  };
}

export function groupBy<T, K>(rows: T[], fn: (r: T) => K): Map<K, T[]> {
  const g = new Map<K, T[]>();
  for (const r of rows) {
    const k = fn(r);
    const list = g.get(k);
    if (list) list.push(r); else g.set(k, [r]);
  }
  return g;
}

const POSITION_ORDER: Position[] = [1, 2, 3, 4, 5, 0];

export function positionBreakdown(rows: MatchSummary[]): { position: Position; summary: Summary }[] {
  const g = groupBy(rows, (r) => r.position);
  return POSITION_ORDER.filter((p) => g.has(p)).map((p) => ({ position: p, summary: summarize(g.get(p)!) }));
}

export function partyBreakdown(rows: MatchSummary[]): { solo: Summary; party: Summary; unknown: Summary } {
  const g = groupBy(rows, (r) => (r.partySize == null ? 'unknown' : r.partySize === 1 ? 'solo' : 'party'));
  return {
    solo: summarize(g.get('solo') ?? []),
    party: summarize(g.get('party') ?? []),
    unknown: summarize(g.get('unknown') ?? []),
  };
}

export function topHeroes(rows: MatchSummary[], limit = 12): { heroId: number; summary: Summary }[] {
  return [...groupBy(rows, (r) => r.heroId)]
    .map(([heroId, rs]) => ({ heroId, summary: summarize(rs) }))
    .sort((a, b) => b.summary.games - a.summary.games || a.heroId - b.heroId)
    .slice(0, limit);
}

export function perAccount(rows: MatchSummary[], accountIds: AccountId[]): {
  accountId: AccountId; summary: Summary; topHero: { heroId: number; games: number }; lastPlayed: number;
}[] {
  const g = groupBy(rows, (r) => r.accountId);
  const out = [];
  for (const accountId of accountIds) {
    const rs = g.get(accountId);
    if (!rs?.length) continue;
    const top = topHeroes(rs, 1)[0];
    out.push({
      accountId, summary: summarize(rs),
      topHero: { heroId: top.heroId, games: top.summary.games },
      lastPlayed: Math.max(...rs.map((r) => r.startTime)),
    });
  }
  return out;
}
