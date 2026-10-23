import type { MatchSummary } from '@/lib/types';
import { topHeroes } from '@/lib/stats';
import { fix, pct } from './format';
import { HeroImg, heroName, type Heroes } from './HeroImg';

export function HeroGrid({ rows, heroes }: { rows: MatchSummary[]; heroes: Heroes }) {
  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 font-medium">Top heroes</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {topHeroes(rows, 12).map(({ heroId, summary: s }) => (
          <div key={heroId} className="flex items-center gap-2">
            <HeroImg heroes={heroes} id={heroId} className="h-9 w-16 shrink-0 rounded-sm object-cover" />
            <div className="min-w-0 text-sm">
              <div className="truncate font-medium">{heroName(heroes, heroId)}</div>
              <div className="text-xs text-muted-foreground">
                {s.games} · {pct(s.wins, s.games)} · KDA {fix(s.kda, 1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
