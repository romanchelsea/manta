import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';

vi.mock('@/components/charts/EChart', () => ({ EChart: () => null }));
vi.mock('@/components/matches/MatchDetailView', () => ({
  MatchDetailView: ({ matchId }: { matchId: number }) => <div data-testid="detail">detail {matchId}</div>,
}));

import { MatchTable } from '@/components/matches/MatchTable';
import type { MatchSummary } from '@/lib/types';

const now = Math.floor(Date.now() / 1000);
const rows: MatchSummary[] = Array.from({ length: 120 }, (_, i) => ({
  key: `111:${i + 1}`, accountId: '111', matchId: i + 1, startTime: now - i * 3600, duration: 1000 + ((i * 37) % 120) * 10,
  win: i % 2 === 0, heroId: 1, kills: 1, deaths: 1, assists: 1, gameMode: 22, lobbyType: 7, partySize: 1, position: 1,
  gpm: 400, xpm: 500, lastHits: 1, heroDamage: 1000, towerDamage: 1,
}));
afterEach(cleanup);

const bodyRows = () => screen.getAllByRole('row').filter((r) => r.dataset.match);

describe('MatchTable', () => {
  it('paginates 50 rows', () => {
    render(<MatchTable rows={rows} accounts={['111']} nameOf={() => 'Alpha'} heroes={undefined} />);
    expect(bodyRows()).toHaveLength(50);
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
  it('sorts by duration descending', () => {
    render(<MatchTable rows={rows} accounts={['111']} nameOf={() => 'Alpha'} heroes={undefined} />);
    fireEvent.click(screen.getByRole('columnheader', { name: /Duration/ }));
    const max = Math.max(...rows.map((r) => r.duration));
    const first = bodyRows()[0];
    expect(within(first).getByText(`${Math.floor(max / 60)}:${String(max % 60).padStart(2, '0')}`)).toBeInTheDocument();
  });
  it('opens detail in a dialog and closes it', async () => {
    render(<MatchTable rows={rows} accounts={['111']} nameOf={() => 'Alpha'} heroes={undefined} />);
    fireEvent.click(bodyRows()[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('detail')).toHaveTextContent('detail 1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByTestId('detail')).toBeNull());
  });
  it('opens detail from the keyboard', async () => {
    render(<MatchTable rows={rows} accounts={['111']} nameOf={() => 'Alpha'} heroes={undefined} />);
    fireEvent.keyDown(bodyRows()[1], { key: 'Enter' });
    expect(await screen.findByTestId('detail')).toHaveTextContent('detail 2');
  });
});
