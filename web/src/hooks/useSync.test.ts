import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/sync', async (orig) => ({
  ...(await orig<typeof import('@/lib/sync')>()),
  loadConstants: vi.fn(async () => ({ heroes: {}, items: {} })),
  syncAccount: vi.fn(),
  removeAccountData: vi.fn(async () => {}),
}));

import { runSync } from '@/hooks/useSync';
import { loadSettings, resetSettingsCache, updateSettings } from '@/lib/settings';
import { removeAccountData, syncAccount } from '@/lib/sync';

const remove = (id: string) => {
  const s = loadSettings();
  updateSettings({ ...s, accounts: s.accounts.filter((a) => a !== id), selected: s.selected.filter((a) => a !== id) });
};

describe('runSync with accounts removed mid-sync', () => {
  beforeEach(() => {
    vi.mocked(syncAccount).mockReset();
    vi.mocked(removeAccountData).mockClear();
    resetSettingsCache();
    updateSettings({ ...loadSettings(), accounts: ['1', '2', '3'], selected: ['1', '2', '3'] });
  });

  it('skips removed accounts and cleans up one removed during its own sync', async () => {
    vi.mocked(syncAccount).mockImplementation(async (id) => {
      if (id === '1') remove('2'); // removed before its turn
      if (id === '3') remove('3'); // removed during its own sync
      return { accountId: id, lastSyncAt: 1, status: 'ok', profile: null };
    });
    await runSync(false);
    expect(vi.mocked(syncAccount).mock.calls.map((c) => c[0])).toEqual(['1', '3']);
    expect(vi.mocked(removeAccountData).mock.calls.map((c) => c[1])).toEqual(['3']);
  });
});
