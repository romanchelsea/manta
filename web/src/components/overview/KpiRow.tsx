import type { MatchSummary } from '@/lib/types';
import { summarize } from '@/lib/stats';
import { fix, fmtDur, pct } from './format';

export function KpiRow({ rows }: { rows: MatchSummary[] }) {
  const s = summarize(rows);
  const kpis: [string, string | number][] = [
    ['Matches', s.games],
    ['Win rate', pct(s.wins, s.games)],
    ['W / L', `${s.wins} / ${s.games - s.wins}`],
    ['KDA', fix(s.kda, 2)],
    ['Avg K/D/A', `${fix(s.avgKills)}/${fix(s.avgDeaths)}/${fix(s.avgAssists)}`],
    ['GPM', fix(s.avgGpm, 0)],
    ['XPM', fix(s.avgXpm, 0)],
    ['Avg duration', fmtDur(s.avgDuration)],
    ['Heroes played', new Set(rows.map((r) => r.heroId)).size],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map(([l, v]) => (
        <div key={l} className="rounded-lg border p-3">
          <div className="text-xl font-semibold tabular-nums">{v}</div>
          <div className="text-xs text-muted-foreground">{l}</div>
        </div>
      ))}
    </div>
  );
}
