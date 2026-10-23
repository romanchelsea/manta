import { pct } from '@/components/overview/format';
import { WEEKDAYS } from './WeekHourHeatmap';

export function WeekdayTable({ grid }: { grid: { games: number; wins: number }[][] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground">
          <th className="text-left font-normal">Day</th>
          <th className="text-right font-normal">Games</th>
          <th className="text-right font-normal">Win rate</th>
        </tr>
      </thead>
      <tbody>
        {grid.map((row, i) => {
          const g = row.reduce((s, c) => s + c.games, 0);
          const w = row.reduce((s, c) => s + c.wins, 0);
          return (
            <tr key={i} className="border-t">
              <td className="py-1">{WEEKDAYS[i]}</td>
              <td className="text-right tabular-nums">{g}</td>
              <td className="text-right tabular-nums">{pct(w, g)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
