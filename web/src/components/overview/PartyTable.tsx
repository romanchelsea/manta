import type { MatchSummary } from '@/lib/types';
import { partyBreakdown } from '@/lib/stats';
import { fix, pct } from './format';

export function PartyTable({ rows }: { rows: MatchSummary[] }) {
  const b = partyBreakdown(rows);
  const lines = [['Solo', b.solo], ['Party', b.party], ['Unknown', b.unknown]] as const;
  return (
    <div>
      <h3 className="mb-2 font-medium">Solo / Party</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th /><th className="text-right">Matches</th><th className="text-right">Win rate</th><th className="text-right">KDA</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(([label, s]) => (
            <tr key={label} className="border-t">
              <td className="py-1.5">{label}</td>
              <td className="text-right tabular-nums">{s.games}</td>
              <td className="text-right tabular-nums">{pct(s.wins, s.games)}</td>
              <td className="text-right tabular-nums">{fix(s.kda, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
