import type { MatchSummary } from '@/lib/types';
import { summarize } from '@/lib/stats';
import { StatTile } from '@/components/Panel';
import { fix, fmtDur, pct } from './format';

export function KpiRow({ rows }: { rows: MatchSummary[] }) {
  const s = summarize(rows);
  const winTone = s.games ? (s.wins / s.games >= 0.5 ? 'win' : 'loss') : undefined;
  const kpis: [string, string | number, ('win' | 'loss' | 'brand')?][] = [
    ['Matches', s.games, 'brand'],
    ['Win rate', pct(s.wins, s.games), winTone],
    ['W / L', `${s.wins} / ${s.games - s.wins}`],
    ['KDA', fix(s.kda, 2)],
    ['Avg K/D/A', `${fix(s.avgKills)}/${fix(s.avgDeaths)}/${fix(s.avgAssists)}`],
    ['GPM', fix(s.avgGpm, 0)],
    ['XPM', fix(s.avgXpm, 0)],
    ['Avg duration', fmtDur(s.avgDuration)],
    ['Heroes played', new Set(rows.map((r) => r.heroId)).size],
  ];
  return (
    <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map(([l, v, tone]) => <StatTile key={l} label={l} value={v} tone={tone} />)}
    </div>
  );
}
