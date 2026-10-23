import { describe, expect, it } from 'vitest';
import type { MatchRecord } from '@/lib/types';
import {
  activityKpis,
  availableYears,
  calendar,
  nthGameOfDay,
  weekdayHourGrid,
  windowBounds,
  calendarEnd,
} from '@/lib/activity';

const a = Date.UTC(2026, 2, 2, 15, 30) / 1000; // local Mon 2026-03-02 23:30
const b = Date.UTC(2026, 2, 2, 16, 30) / 1000; // local Tue 2026-03-03 00:30

let id = 0;
function rec(startTime: number, accountId = '1', win = true, duration = 1800): MatchRecord {
  id++;
  return { key: `${accountId}:${id}`, accountId, matchId: id, startTime, duration, win };
}

describe('nthGameOfDay', () => {
  it('uses local days', () => {
    const r = nthGameOfDay([rec(a), rec(b)]);
    expect(r[0]).toEqual({ n: 1, games: 2, wins: 2 });
    expect(r[1].games).toBe(0);
  });
  it('is per account', () => {
    const t = Date.UTC(2026, 2, 2, 2, 0) / 1000;
    const r = nthGameOfDay([rec(t), rec(t + 60), rec(t + 120), rec(t, '2')]);
    expect([r[0].games, r[1].games, r[2].games]).toEqual([2, 1, 1]);
  });
  it('buckets 8+', () => {
    const t = Date.UTC(2026, 2, 2, 2, 0) / 1000;
    const rs = Array.from({ length: 10 }, (_, i) => rec(t + i * 60));
    const r = nthGameOfDay(rs);
    expect(r).toHaveLength(8);
    expect(r[7].games).toBe(3);
  });
});

describe('weekdayHourGrid', () => {
  it('uses local time', () => {
    const g = weekdayHourGrid([rec(a), rec(b)]);
    expect(g[0][23].games).toBe(1);
    expect(g[1][0].games).toBe(1);
  });
});

describe('calendar', () => {
  it('spans 52 weeks plus current', () => {
    const c = calendar([rec(a)], new Date(2026, 2, 3));
    expect(c.days).toHaveLength(366);
    expect(c.days[0].date).toBe('2025-03-03');
    expect(c.days[0].weekday).toBe(0);
    expect(c.days.at(-1)!.date).toBe('2026-03-03');
    expect(c.weeks).toBe(53);
    expect(c.days.find((d) => d.date === '2026-03-02')!.games).toBe(1);
  });
});

describe('activityKpis', () => {
  it('computes', () => {
    const k = activityKpis([rec(a), rec(b)]);
    expect(k.activeDays).toBe(2);
    expect(k.gamesPerActiveDay).toBe(1);
    expect(k.totalSeconds).toBe(3600);
    expect(k.gamesPerWeek).toBeCloseTo(2);
  });
});

describe('windows', () => {
  it('year bounds are local', () => {
    const [s, e] = windowBounds({ kind: 'year', year: 2025 }, new Date(2026, 5, 1));
    expect(s).toBe(new Date(2025, 0, 1, 0, 0, 0).getTime() / 1000);
    expect(e).toBe(new Date(2025, 11, 31, 23, 59, 59).getTime() / 1000);
  });
  it('all and calendarEnd', () => {
    const now = new Date(2026, 5, 1, 12);
    expect(windowBounds({ kind: 'all' }, now)).toEqual([0, now.getTime() / 1000]);
    expect(calendarEnd({ kind: 'year', year: 2025 }, now).getMonth()).toBe(11);
    expect(calendarEnd({ kind: 'year', year: 2026 }, now).getDate()).toBe(1);
  });
  it('availableYears desc', () => {
    const y = availableYears([rec(Date.UTC(2024, 5, 1) / 1000), rec(a), rec(Date.UTC(2025, 5, 1) / 1000)]);
    expect(y).toEqual([2026, 2025, 2024]);
  });
});
