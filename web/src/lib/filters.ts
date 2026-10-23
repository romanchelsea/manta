import type { AccountId } from '@/lib/types';
import { DAY } from '@/lib/sync';

export type TimeRange =
  | { kind: 'preset'; days: 7 | 30 | 90 | 180 | 365 }
  | { kind: 'custom'; from: string; to: string }; // YYYY-MM-DD, local dates

export const DEFAULT_RANGE: TimeRange = { kind: 'preset', days: 365 };

export function timeBounds(range: TimeRange, nowSec: number): [number, number] {
  if (range.kind === 'preset') return [nowSec - range.days * DAY, nowSec + DAY];
  const floor = nowSec - 365 * DAY;
  const parsedFrom = range.from ? new Date(range.from + 'T00:00:00').getTime() / 1000 : floor;
  const from = Math.max(parsedFrom, floor);
  const to = range.to ? new Date(range.to + 'T23:59:59').getTime() / 1000 : nowSec;
  return [from, to];
}

export function filterRows<T extends { accountId: AccountId; startTime: number }>(
  rows: T[],
  f: { selected: Set<AccountId>; from: number; to: number },
): T[] {
  return rows
    .filter((r) => f.selected.has(r.accountId) && r.startTime >= f.from && r.startTime <= f.to)
    .sort((a, b) => b.startTime - a.startTime);
}
