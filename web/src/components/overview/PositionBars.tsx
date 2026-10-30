import type { MatchSummary } from '@/lib/types';
import { POSITION_NAMES } from '@/lib/dota';
import { positionBreakdown } from '@/lib/stats';
import { Panel } from '@/components/Panel';
import { fix, pct } from './format';

export function PositionBars({ rows }: { rows: MatchSummary[] }) {
  const data = positionBreakdown(rows);
  const max = Math.max(1, ...data.map((d) => d.summary.games));
  return (
    <Panel title="Positions" description="Positions are estimated from lane and last hits; unparsed matches show as Unknown">
      <div className="space-y-2.5">
        {data.map(({ position, summary: s }) => (
          <div key={position} className="flex items-center gap-2 text-sm"
            title={`${POSITION_NAMES[position]}\n${s.games} matches · Win rate ${pct(s.wins, s.games)} · KDA ${fix(s.kda, 2)}`}>
            <span className="w-16 shrink-0 font-medium">{position ? `Pos ${position}` : 'Unknown'}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-brand-gradient animate-grow-x" style={{ width: `${(s.games / max) * 100}%` }} />
            </div>
            <span className="w-28 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
              {s.games} · {pct(s.wins, s.games)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}
