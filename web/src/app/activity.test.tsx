import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/activity' }));
vi.mock('@/hooks/useSync', () => ({
  useSync: () => ({ syncAll: vi.fn(async () => {}), running: false, states: {}, stage: {} }),
}));
vi.mock('@/components/charts/EChart', () => ({
  EChart: ({ option }: { option: unknown }) => <pre data-testid="echart">{JSON.stringify(option)}</pre>,
}));

import ActivityPage from '@/app/activity/page';
import { Providers } from '@/app/providers';
import { db } from '@/lib/db';
import { resetSettingsCache } from '@/lib/settings';
import type { MatchRecord } from '@/lib/types';

const t = (y: number, m: number, d: number, h = 20) => new Date(y, m - 1, d, h).getTime() / 1000;
const rec = (id: number, start: number, win: boolean): MatchRecord => ({
  key: `111:${id}`, accountId: '111', matchId: id, startTime: start, duration: 2400, win,
});

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('d2web.accounts', JSON.stringify(['111']));
  localStorage.setItem('d2web.selected', JSON.stringify(['111']));
  resetSettingsCache();
  await Promise.all([db.records.clear(), db.syncState.clear()]);
  await db.records.bulkPut([
    rec(1, t(2025, 3, 1), true), rec(2, t(2025, 3, 1, 21), false), rec(3, t(2025, 6, 10), true),
    rec(4, t(2025, 11, 5), true), rec(5, t(2026, 2, 2), false), rec(6, t(2026, 9, 1), true),
  ]);
});
afterEach(cleanup);

const kpi = (label: string) => screen.getByText(label).parentElement!.firstElementChild!.textContent;
const calendarOption = () =>
  screen.getAllByTestId('echart').map((e) => JSON.parse(e.textContent!)).find((o) => o.calendar);

describe('Activity page', () => {
  it('lists years, switches window and recomputes', async () => {
    render(<Providers><ActivityPage /></Providers>);
    const select = (await screen.findByLabelText('Activity window')) as HTMLSelectElement;
    await waitFor(() => expect(within(select).getByText('2025')).toBeInTheDocument());
    const labels = within(select).getAllByRole('option').map((o) => o.textContent);
    expect(labels).toEqual(['Last 12 months', '2026', '2025', 'All time']);
    fireEvent.change(select, { target: { value: 'year:2025' } });
    await waitFor(() => expect(kpi('Active days')).toBe('3'));
    const range = calendarOption().calendar.range as string[];
    expect(range[0] <= '2025-01-01').toBe(true);
    expect(range[1] >= '2025-12-31').toBe(true);
    fireEvent.change(select, { target: { value: 'all' } });
    await waitFor(() => expect(kpi('Active days')).toBe('5'));
  });
});
