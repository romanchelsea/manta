import { describe, expect, it } from 'vitest';
import type { MatchSummary } from '@/lib/types';
import { groupBy, partyBreakdown, perAccount, positionBreakdown, summarize, topHeroes } from '@/lib/stats';

let n = 0;
const row = (o: Partial<MatchSummary> = {}): MatchSummary => ({
  key: `a:${++n}`, accountId: 'a', matchId: n, startTime: 1000 + n, duration: 1800, win: true,
  heroId: 1, kills: 1, deaths: 1, assists: 1, gameMode: 22, lobbyType: 7, partySize: 1, position: 1,
  gpm: null, xpm: null, lastHits: null, heroDamage: null, towerDamage: null, ...o,
});

describe('summarize', () => {
  it('averages and skips null gpm/xpm', () => {
    const s = summarize([
      row({ kills: 10, deaths: 2, assists: 5, win: true, gpm: 600, xpm: 500 }),
      row({ kills: 2, deaths: 8, assists: 10, win: false }),
    ]);
    expect(s.games).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.winRate).toBe(0.5);
    expect(s.kda).toBeCloseTo(2.7);
    expect(s.avgGpm).toBe(600);
    expect(s.avgXpm).toBe(500);
  });
  it('handles empty', () => {
    const s = summarize([]);
    expect(s.games).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.avgGpm).toBeNull();
  });
});

describe('breakdowns', () => {
  it('groupBy groups', () => {
    expect(groupBy([1, 2, 3], (x) => x % 2).get(1)).toEqual([1, 3]);
  });
  it('positionBreakdown order', () => {
    const r = positionBreakdown([2, 0, 1, 2].map((p) => row({ position: p as 0 })));
    expect(r.map((x) => x.position)).toEqual([1, 2, 0]);
    expect(r[1].summary.games).toBe(2);
  });
  it('partyBreakdown', () => {
    const r = partyBreakdown([row({ partySize: 1 }), row({ partySize: 3 }), row({ partySize: null })]);
    expect([r.solo.games, r.party.games, r.unknown.games]).toEqual([1, 1, 1]);
  });
  it('topHeroes ties and limit', () => {
    const rows = [row({ heroId: 5 }), row({ heroId: 3 }), row({ heroId: 9 }), row({ heroId: 9 })];
    expect(topHeroes(rows).map((h) => h.heroId)).toEqual([9, 3, 5]);
    expect(topHeroes(rows, 2)).toHaveLength(2);
  });
  it('perAccount', () => {
    const rows = [
      row({ accountId: 'a', startTime: 5, heroId: 1 }),
      row({ accountId: 'a', startTime: 9, heroId: 1 }),
      row({ accountId: 'b', startTime: 7, heroId: 2 }),
    ];
    const r = perAccount(rows, ['b', 'a', 'c']);
    expect(r.map((x) => x.accountId)).toEqual(['b', 'a']);
    expect(r[1].lastPlayed).toBe(9);
    expect(r[1].topHero).toEqual({ heroId: 1, games: 2 });
  });
});
