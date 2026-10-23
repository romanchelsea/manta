'use client';
import { useMemo } from 'react';
import { EChart } from '@/components/charts/EChart';
import { calendar } from '@/lib/activity';
import type { MatchRecord } from '@/lib/types';

export function CalendarHeatmap({ records, end }: { records: MatchRecord[]; end: Date }) {
  const option = useMemo(() => {
    const { days } = calendar(records, end);
    const wl = new Map(days.map((d) => [d.date, d]));
    const max = Math.max(1, ...days.map((d) => d.games));
    return {
      tooltip: {
        formatter: (p: { value: [string, number] }) => {
          const d = wl.get(p.value[0]);
          return d && d.games ? `${d.date}<br/>${d.games} games · ${d.wins}W ${d.games - d.wins}L` : `${p.value[0]}<br/>No games`;
        },
      },
      visualMap: { min: 0, max, show: false, inRange: { color: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] } },
      calendar: {
        range: [days[0].date, days[days.length - 1].date],
        cellSize: ['auto', 13], left: 30, right: 10, top: 20,
        firstDay: 1, splitLine: { show: false }, itemStyle: { borderWidth: 2, borderColor: 'transparent' },
        yearLabel: { show: false }, dayLabel: { firstDay: 1, nameMap: 'en' }, monthLabel: { nameMap: 'en' },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: days.map((d) => [d.date, d.games]) }],
    };
  }, [records, end]);
  return <EChart option={option} height={150} />;
}
