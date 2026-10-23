import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMatchDetail } from '@/hooks/useMatchDetail';
import { db } from '@/lib/db';
import { resetSettingsCache } from '@/lib/settings';

const nowSec = Math.floor(Date.now() / 1000);
const DAY = 86400;
function raw(id: number, start: number) {
  return {
    match_id: id, start_time: start, duration: 2000, radiant_win: true, game_mode: 22, lobby_type: 7,
    radiant_score: 30, dire_score: 20, players: [{ account_id: 111, player_slot: 0, hero_id: 1, kills: 1, deaths: 2, assists: 3 }],
  };
}
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  localStorage.clear();
  resetSettingsCache();
  await db.details.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('useMatchDetail', () => {
  it('uses cached detail without fetching', async () => {
    await db.details.put({
      matchId: 5, startTime: nowSec, duration: 1, radiantWin: true, gameMode: 22, lobbyType: 7, radiantScore: 1,
      direScore: 2, radiantGoldAdv: null, radiantXpAdv: null, players: [], fetchedAt: 1,
    });
    const { result } = renderHook(() => useMatchDetail(5), { wrapper });
    await waitFor(() => expect(result.current.data?.matchId).toBe(5));
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('fetches a recent match once and stores it', async () => {
    fetchMock.mockResolvedValue(ok(raw(6, nowSec - 10 * DAY)));
    const { result } = renderHook(() => useMatchDetail(6), { wrapper });
    await waitFor(() => expect(result.current.data?.matchId).toBe(6));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/matches/6');
    await waitFor(async () => expect(await db.details.get(6)).toBeTruthy());
  });
  it('does not store an old match', async () => {
    fetchMock.mockResolvedValue(ok(raw(7, nowSec - 200 * DAY)));
    const { result } = renderHook(() => useMatchDetail(7), { wrapper });
    await waitFor(() => expect(result.current.data?.matchId).toBe(7));
    expect(await db.details.get(7)).toBeUndefined();
  });
  it('surfaces fetch errors', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    const { result } = renderHook(() => useMatchDetail(8), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.data).toBeUndefined();
  });
});
