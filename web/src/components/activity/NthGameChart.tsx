'use client';
import { useMemo } from 'react';
import { EChart } from '@/components/charts/EChart';

export function NthGameChart({ nth }: { nth: { n: number; games: number; wins: number }[] }) {
  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        formatter: (ps: { dataIndex: number }[]) => {
          const c = nth[ps[0].dataIndex];
          return `Game ${c.n === 8 ? '8+' : c.n}<br/>${c.games ? `${((c.wins / c.games) * 100).toFixed(1)}%` : '—'} (${c.games} games)`;
        },
      },
      grid: { left: 45, right: 15, top: 15, bottom: 30 },
      xAxis: { type: 'category', data: nth.map((c) => (c.n === 8 ? '8+' : String(c.n))) },
      yAxis: { type: 'value', min: 0.3, max: 0.7, axisLabel: { formatter: (v: number) => `${Math.round(v * 100)}%` } },
      series: [
        {
          type: 'line', name: 'Win rate', connectNulls: true,
          // Win rates outside the 30–70% axis are clipped; smoothing would overshoot there.
          smooth: false,
          data: nth.map((c) => (c.games ? c.wins / c.games : null)),
          markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0.5 }], lineStyle: { type: 'dashed' }, label: { show: false } },
        },
      ],
    }),
    [nth],
  );
  return <EChart option={option} height={220} />;
}
