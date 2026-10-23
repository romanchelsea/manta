import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountBar } from '@/components/AccountBar';
import { PRIVATE_MESSAGE } from '@/lib/sync';

afterEach(cleanup);

describe('AccountBar', () => {
  it('shows private message', async () => {
    const user = userEvent.setup();
    render(
      <AccountBar
        accounts={['123']}
        selected={['123']}
        onToggle={() => {}}
        profiles={{}}
        states={{ '123': { accountId: '123', lastSyncAt: 1, status: 'private', error: PRIVATE_MESSAGE, profile: null } }}
        stage={{}}
      />,
    );
    expect(screen.getByText(PRIVATE_MESSAGE)).toBeInTheDocument();
    void user;
  });

  it('toggles aria-pressed on click', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Wrapper />);
    const chip = screen.getByRole('button', { name: /123/ });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    await user.click(chip);
    expect(screen.getByRole('button', { name: /123/ })).toHaveAttribute('aria-pressed', 'false');
    void rerender;
  });
});

import { useState } from 'react';
function Wrapper() {
  const [sel, setSel] = useState<string[]>(['123']);
  return (
    <AccountBar
      accounts={['123']}
      selected={sel}
      onToggle={(id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
      profiles={{}}
      states={{}}
      stage={{}}
    />
  );
}
