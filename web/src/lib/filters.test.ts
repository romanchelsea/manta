import { describe, expect, it } from 'vitest';
import { DEFAULT_RANGE, filterRows, timeBounds } from '@/lib/filters';

const DAY = 86400;
const now = Math.floor(new Date('2026-03-10T12:00:00').getTime() / 1000);

describe('timeBounds', () => {
  it('preset', () => {
    expect(timeBounds({ kind: 'preset', days: 30 }, now)).toEqual([now - 30 * DAY, now + DAY]);
    expect(DEFAULT_RANGE).toEqual({ kind: 'preset', days: 365 });
  });
  it('custom clamps from and ends to day end', () => {
    const [from, to] = timeBounds({ kind: 'custom', from: '2000-01-01', to: '2026-03-02' }, now);
    expect(from).toBe(now - 365 * DAY);
    expect(to).toBe(new Date('2026-03-02T23:59:59').getTime() / 1000);
  });
});

describe('filterRows', () => {
  it('filters and sorts desc', () => {
    const rows = [
      { accountId: 'a', startTime: 10 },
      { accountId: 'b', startTime: 20 },
      { accountId: 'a', startTime: 30 },
      { accountId: 'a', startTime: 99 },
    ];
    const r = filterRows(rows, { selected: new Set(['a']), from: 5, to: 40 });
    expect(r.map((x) => x.startTime)).toEqual([30, 10]);
  });
});
