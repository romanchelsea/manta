import type { MatchSummary } from '@/lib/types';
import { partyBreakdown } from '@/lib/stats';
import { TH, TR } from '@/components/Panel';
import { fix, pct } from './format';

export function PartyTable({ rows }: { rows: MatchSummary[] }) {
  const b = partyBreakdown(rows);
  const lines = [['Solo', b.solo], ['Party', b.party], ['Unknown', b.unknown]] as const;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">Solo / Party</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className={TH} /><th className={`${TH} text-right`}>Matches</th><th className={`${TH} text-right`}>Win rate</th>
            <th className={`${TH} text-right`}>KDA</th>
          </tr>
        </thead>
        <tbody>
          {lines.map(([label, s]) => (
            <tr key={label} className={`${TR} [&>td]:px-2`}>
              <td className="py-2">{label}</td>
              <td className="text-right font-mono tabular-nums">{s.games}</td>
              <td className="text-right font-mono tabular-nums">{pct(s.wins, s.games)}</td>
              <td className="text-right font-mono tabular-nums">{fix(s.kda, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
