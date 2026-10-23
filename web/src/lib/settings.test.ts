import { describe, it, expect } from 'vitest';
import { addAccounts, loadSettings } from '@/lib/settings';
import { DEFAULT_RANGE } from '@/lib/filters';

describe('settings', () => {
  it('dedupes accounts', () => {
    const s = loadSettings();
    const r = addAccounts(s, [
      '76561198000000000',
      '39734272',
      'https://www.opendota.com/players/39734272',
      'https://steamcommunity.com/id/x',
    ]);
    expect(r.added).toEqual(['39734272']);
    expect(r.invalid).toEqual(['https://steamcommunity.com/id/x']);
    expect(r.settings.selected).toContain('39734272');
  });

  it('returns defaults on bad JSON', () => {
    localStorage.setItem('d2web.accounts', 'not json');
    localStorage.setItem('d2web.selected', 'not json');
    localStorage.setItem('d2web.range', 'not json');
    expect(loadSettings()).toEqual({ accounts: [], selected: [], apiKey: '', range: DEFAULT_RANGE });
  });
});
