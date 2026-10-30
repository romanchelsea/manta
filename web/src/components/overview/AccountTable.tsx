import type { MatchSummary } from '@/lib/types';
import type { SyncState } from '@/lib/db';
import { perAccount } from '@/lib/stats';
import { rankName } from '@/lib/dota';
import { accountColor } from '@/hooks/useData';
import { Panel, TH, TR } from '@/components/Panel';
import { ago, fix, pct } from './format';
import { HeroImg, heroName, type Heroes } from './HeroImg';

export function AccountTable({
  rows, accounts, profiles, heroes,
}: { rows: MatchSummary[]; accounts: string[]; profiles: Record<string, SyncState>; heroes: Heroes }) {
  const data = perAccount(rows, accounts);
  return (
    <Panel title="Accounts">
      <div className="-mx-2 overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm">
        <thead>
          <tr className="text-left">
            <th className={TH}>Account</th><th className={TH}>Rank</th><th className={`${TH} text-right`}>Matches</th>
            <th className={`${TH} text-right`}>Win rate</th><th className={`${TH} text-right`}>KDA</th>
            <th className={`${TH} text-right`}>GPM</th><th className={TH}>Most played</th><th className={TH}>Last played</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => {
            const p = profiles[d.accountId]?.profile;
            return (
              <tr key={d.accountId} className={`${TR} [&>td]:px-2`}>
                <td className="py-2 font-medium">
                  <span className="mr-2 inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: accountColor(accounts.indexOf(d.accountId)) }} />
                  {p?.name ?? d.accountId}
                </td>
                <td>{rankName(p?.rankTier)}</td>
                <td className="text-right font-mono tabular-nums">{d.summary.games}</td>
                <td className={`text-right font-mono tabular-nums ${d.summary.games && d.summary.wins / d.summary.games >= 0.5 ? 'text-win' : 'text-loss'}`}>
                  {pct(d.summary.wins, d.summary.games)}
                </td>
                <td className="text-right font-mono tabular-nums">{fix(d.summary.kda, 2)}</td>
                <td className="text-right font-mono tabular-nums">{fix(d.summary.avgGpm, 0)}</td>
                <td>
                  <span className="inline-flex items-center gap-1.5">
                    <HeroImg heroes={heroes} id={d.topHero.heroId} className="h-5 w-9 rounded-sm object-cover" />
                    <span>{heroName(heroes, d.topHero.heroId)} ({d.topHero.games})</span>
                  </span>
                </td>
                <td className="text-muted-foreground">{ago(d.lastPlayed)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </Panel>
  );
}
