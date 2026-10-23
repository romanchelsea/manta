import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('@/hooks/useSync', () => ({
  useSync: () => ({ syncAll: vi.fn(async () => {}), running: false, states: {}, stage: {} }),
}));

import Home from '@/app/page';
import { Providers } from '@/app/providers';
import { db } from '@/lib/db';
import { resetSettingsCache } from '@/lib/settings';
import type { MatchSummary } from '@/lib/types';

const now = Math.floor(Date.now() / 1000);
function row(accountId: string, matchId: number, win: boolean, gpm: number | null): MatchSummary {
  return {
    key: `${accountId}:${matchId}`, accountId, matchId, startTime: now - matchId * 3600, duration: 2400, win,
    heroId: 1, kills: 5, deaths: 2, assists: 7, gameMode: 22, lobbyType: 7, partySize: 1, position: 1,
    gpm, xpm: gpm, lastHits: 100, heroDamage: 1, towerDamage: 1,
  };
}

beforeEach(async () => {
  localStorage.clear();
  localStorage.setItem('d2web.accounts', JSON.stringify(['111', '222']));
  localStorage.setItem('d2web.selected', JSON.stringify(['111', '222']));
  resetSettingsCache();
  await Promise.all([db.summaries.clear(), db.syncState.clear(), db.constants.clear()]);
  await db.summaries.bulkPut([row('111', 1, true, 500), row('111', 2, true, null), row('222', 3, false, 400)]);
  await db.constants.bulkPut([
    { key: 'heroes', data: { 1: { id: 1, name: 'Anti-Mage', short: 'antimage' } }, fetchedAt: 1 },
    { key: 'items', data: {}, fetchedAt: 1 },
  ]);
  await db.syncState.bulkPut([
    { accountId: '111', lastSyncAt: 1, status: 'ok', profile: { accountId: '111', name: 'Alpha', avatar: null, rankTier: 55 } },
    { accountId: '222', lastSyncAt: 1, status: 'ok', profile: { accountId: '222', name: 'Beta', avatar: null, rankTier: null } },
  ]);
});
afterEach(cleanup);

describe('Overview page', () => {
  it('renders stats without NaN', async () => {
    const { container } = render(<Providers><Home /></Providers>);
    await waitFor(() => expect(screen.getAllByText('66.7%').length).toBeGreaterThan(0));
    expect(screen.getByText('2 / 1')).toBeInTheDocument();
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/NaN/);
  });
});
