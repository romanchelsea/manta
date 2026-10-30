import { pct } from '@/components/overview/format';
import { TH, TR } from '@/components/Panel';
import { WEEKDAYS } from './WeekHourHeatmap';

export function WeekdayTable({ grid }: { grid: { games: number; wins: number }[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th className={`${TH} text-left`}>Day</th>
          <th className={`${TH} text-right`}>Games</th>
          <th className={`${TH} text-right`}>Win rate</th>
        </tr>
      </thead>
      <tbody>
        {grid.map((row, i) => {
          const g = row.reduce((s, c) => s + c.games, 0);
          const w = row.reduce((s, c) => s + c.wins, 0);
          return (
            <tr key={i} className={`${TR} [&>td]:px-2`}>
              <td className="py-1.5 font-medium">{WEEKDAYS[i]}</td>
              <td className="text-right font-mono tabular-nums">{g}</td>
              <td className="text-right font-mono tabular-nums">{pct(w, g)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
