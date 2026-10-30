import type { MatchSummary } from '@/lib/types';
import { topHeroes } from '@/lib/stats';
import { Panel } from '@/components/Panel';
import { fix, pct } from './format';
import { HeroImg, heroName, type Heroes } from './HeroImg';

export function HeroGrid({ rows, heroes }: { rows: MatchSummary[]; heroes: Heroes }) {
  return (
    <Panel title="Top heroes">
      <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {topHeroes(rows, 12).map(({ heroId, summary: s }) => (
          <div key={heroId} className="group flex items-center gap-3 rounded-lg border border-transparent p-1.5 transition-all hover:border-border hover:bg-muted/50">
            <HeroImg heroes={heroes} id={heroId} className="h-9 w-16 shrink-0 rounded-md object-cover shadow-sm transition-transform duration-300 group-hover:scale-105" />
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{heroName(heroes, heroId)}</div>
              <div className="text-xs text-muted-foreground">
                {s.games} · {pct(s.wins, s.games)} · KDA {fix(s.kda, 1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
