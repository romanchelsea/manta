import type { MatchSummary } from '@/lib/types';
import { POSITION_NAMES } from '@/lib/dota';
import { positionBreakdown } from '@/lib/stats';
import { fix, pct } from './format';

export function PositionBars({ rows }: { rows: MatchSummary[] }) {
  const data = positionBreakdown(rows);
  const max = Math.max(1, ...data.map((d) => d.summary.games));
  return (
    <div className="rounded-lg border p-3">
      <h3 className="font-medium">Positions</h3>
      <p className="mb-2 text-xs text-muted-foreground">
        Positions are estimated from lane and last hits; unparsed matches show as Unknown
      </p>
      <div className="space-y-1.5">
        {data.map(({ position, summary: s }) => (
          <div key={position} className="flex items-center gap-2 text-sm"
            title={`${POSITION_NAMES[position]}\n${s.games} matches · Win rate ${pct(s.wins, s.games)} · KDA ${fix(s.kda, 2)}`}>
            <span className="w-16 shrink-0">{position ? `Pos ${position}` : 'Unknown'}</span>
            <div className="h-2 flex-1 rounded bg-muted">
              <div className="h-2 rounded bg-primary" style={{ width: `${(s.games / max) * 100}%` }} />
            </div>
            <span className="w-28 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
              {s.games} · {pct(s.wins, s.games)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
