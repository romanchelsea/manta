import type { MatchRecord } from '@/lib/types';
import { DAY } from '@/lib/sync';

export type ActivityWindow = { kind: 'last12' } | { kind: 'year'; year: number } | { kind: 'all' };

export function windowBounds(w: ActivityWindow, now: Date): [number, number] {
  const nowSec = Math.floor(now.getTime() / 1000);
  if (w.kind === 'all') return [0, now.getTime() / 1000];
  if (w.kind === 'year') {
    return [
      new Date(w.year, 0, 1, 0, 0, 0).getTime() / 1000,
      new Date(w.year, 11, 31, 23, 59, 59).getTime() / 1000,
    ];
  }
  const from = new Date(now);
  from.setFullYear(from.getFullYear() - 1);
  return [Math.floor(from.getTime() / 1000), nowSec];
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function calendarEnd(w: ActivityWindow, now: Date): Date {
  if (w.kind === 'year' && w.year < now.getFullYear()) return new Date(w.year, 11, 31);
  return startOfDay(now);
}

export function availableYears(records: MatchRecord[]): number[] {
  const s = new Set<number>();
  for (const r of records) s.add(new Date(r.startTime * 1000).getFullYear());
  return [...s].sort((x, y) => y - x);
}

export interface CalendarDay {
  date: string;
  week: number;
  weekday: number;
  games: number;
  wins: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayKeyOf = (t: number) => dateStr(new Date(t * 1000));

export function calendar(records: MatchRecord[], end: Date): { weeks: number; days: CalendarDay[] } {
  const e = startOfDay(end);
  const start = new Date(e);
  start.setDate(start.getDate() - 7 * 52 - ((e.getDay() + 6) % 7));
  const byDay = new Map<string, { games: number; wins: number }>();
  for (const r of records) {
    const k = dayKeyOf(r.startTime);
    const c = byDay.get(k) ?? { games: 0, wins: 0 };
    c.games++;
    if (r.win) c.wins++;
    byDay.set(k, c);
  }
  const days: CalendarDay[] = [];
  const d = new Date(start);
  for (let i = 0; d <= e; d.setDate(d.getDate() + 1), i++) {
    const date = dateStr(d);
    const c = byDay.get(date);
    days.push({ date, week: Math.floor(i / 7), weekday: i % 7, games: c?.games ?? 0, wins: c?.wins ?? 0 });
  }
  return { weeks: Math.ceil(days.length / 7), days };
}

export function weekdayHourGrid(records: MatchRecord[]): { games: number; wins: number }[][] {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ games: 0, wins: 0 })));
  for (const r of records) {
    const d = new Date(r.startTime * 1000);
    const c = grid[(d.getDay() + 6) % 7][d.getHours()];
    c.games++;
    if (r.win) c.wins++;
  }
  return grid;
}

export function nthGameOfDay(records: MatchRecord[]): { n: number; games: number; wins: number }[] {
  const groups = new Map<string, MatchRecord[]>();
  for (const r of [...records].sort((x, y) => x.startTime - y.startTime)) {
    const k = `${r.accountId}:${dayKeyOf(r.startTime)}`;
    const arr = groups.get(k);
    if (arr) arr.push(r);
    else groups.set(k, [r]);
  }
  const out = Array.from({ length: 8 }, (_, i) => ({ n: i + 1, games: 0, wins: 0 }));
  for (const arr of groups.values()) {
    arr.forEach((r, i) => {
      const c = out[Math.min(7, i)];
      c.games++;
      if (r.win) c.wins++;
    });
  }
  return out;
}

export function activityKpis(records: MatchRecord[]): {
  activeDays: number;
  gamesPerActiveDay: number;
  gamesPerWeek: number;
  totalSeconds: number;
} {
  if (!records.length) return { activeDays: 0, gamesPerActiveDay: 0, gamesPerWeek: 0, totalSeconds: 0 };
  const days = new Set(records.map((r) => dayKeyOf(r.startTime)));
  let min = Infinity;
  let max = -Infinity;
  let totalSeconds = 0;
  for (const r of records) {
    min = Math.min(min, r.startTime);
    max = Math.max(max, r.startTime);
    totalSeconds += r.duration;
  }
  const spanDays = (max - min) / DAY + 1;
  return {
    activeDays: days.size,
    gamesPerActiveDay: records.length / Math.max(1, days.size),
    gamesPerWeek: records.length / Math.max(1, spanDays / 7),
    totalSeconds,
  };
}
