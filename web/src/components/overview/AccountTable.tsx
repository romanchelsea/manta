import type { MatchSummary } from '@/lib/types';
import type { SyncState } from '@/lib/db';
import { perAccount } from '@/lib/stats';
import { rankName } from '@/lib/dota';
import { accountColor } from '@/hooks/useData';
import { ago, fix, pct } from './format';
import { HeroImg, heroName, type Heroes } from './HeroImg';

export function AccountTable({
  rows, accounts, profiles, heroes,
}: { rows: MatchSummary[]; accounts: string[]; profiles: Record<string, SyncState>; heroes: Heroes }) {
  const data = perAccount(rows, accounts);
  return (
    <div className="overflow-x-auto rounded-lg border p-3">
      <h3 className="mb-2 font-medium">Accounts</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th>Account</th><th>Rank</th><th className="text-right">Matches</th><th className="text-right">Win rate</th>
            <th className="text-right">KDA</th><th className="text-right">GPM</th><th>Most played</th><th>Last played</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => {
            const p = profiles[d.accountId]?.profile;
            return (
              <tr key={d.accountId} className="border-t">
                <td className="py-1.5">
                  <span className="mr-2 inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: accountColor(accounts.indexOf(d.accountId)) }} />
                  {p?.name ?? d.accountId}
                </td>
                <td>{rankName(p?.rankTier)}</td>
                <td className="text-right tabular-nums">{d.summary.games}</td>
                <td className="text-right tabular-nums">{pct(d.summary.wins, d.summary.games)}</td>
                <td className="text-right tabular-nums">{fix(d.summary.kda, 2)}</td>
                <td className="text-right tabular-nums">{fix(d.summary.avgGpm, 0)}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    <HeroImg heroes={heroes} id={d.topHero.heroId} className="h-5 w-9 rounded-sm object-cover" />
                    {heroName(heroes, d.topHero.heroId)} ({d.topHero.games})
                  </span>
                </td>
                <td className="text-muted-foreground">{ago(d.lastPlayed)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
