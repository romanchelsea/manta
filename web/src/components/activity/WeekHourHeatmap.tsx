'use client';
import { useMemo } from 'react';
import { EChart } from '@/components/charts/EChart';
import { pct } from '@/components/overview/format';

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekHourHeatmap({ grid }: { grid: { games: number; wins: number }[][] }) {
  const option = useMemo(() => {
    const data: [number, number, number, number][] = [];
    grid.forEach((row, wd) => row.forEach((c, h) => data.push([h, wd, c.games, c.wins])));
    const max = Math.max(1, ...data.map((d) => d[2]));
    return {
      tooltip: {
        formatter: (p: { value: [number, number, number, number] }) => {
          const [h, wd, g, w] = p.value;
          return `${WEEKDAYS[wd]} ${h}:00–${h + 1}:00<br/>${g} games · win rate ${pct(w, g)}`;
        },
      },
      grid: { left: 40, right: 10, top: 10, bottom: 30 },
      xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, h) => String(h)), splitArea: { show: true } },
      yAxis: { type: 'category', data: WEEKDAYS, inverse: true, splitArea: { show: true } },
      visualMap: { min: 0, max, show: false, dimension: 2, inRange: { color: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] } },
      series: [{ type: 'heatmap', data, encode: { x: 0, y: 1, value: 2 } }],
    };
  }, [grid]);
  return <EChart option={option} height={220} />;
}
