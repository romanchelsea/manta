import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useSync', () => ({
  useSync: () => ({ syncAll: vi.fn(async () => {}), running: false, states: {}, stage: {} }),
}));
vi.mock('@/lib/sync', async (orig) => ({
  ...(await orig<typeof import('@/lib/sync')>()),
  removeAccountData: vi.fn(async () => {}),
}));

import { AccountsDialog } from '@/components/AccountsDialog';
import { removeAccountData } from '@/lib/sync';

afterEach(cleanup);

describe('AccountsDialog', () => {
  it('adds valid lines, reports invalid, removes', async () => {
    const user = userEvent.setup();
    render(<AccountsDialog open onOpenChange={() => {}} />);
    await user.type(
      screen.getByRole('textbox', { name: /account ids/i }),
      '39734272\nhttps://www.opendota.com/players/86745912\nhttps://steamcommunity.com/id/x',
    );
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(2);
    expect(screen.getByText('Could not read: https://steamcommunity.com/id/x')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /^Remove/ })[0]);
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(1);
    expect(removeAccountData).toHaveBeenCalled();
  });
});
