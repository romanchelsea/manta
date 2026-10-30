import type { ResolvedTheme } from '@/lib/theme';

// Canvas charts can't read CSS variables, so the theme colors are repeated here.
const TOKENS = {
  light: {
    text: '#1f1d2b', muted: '#6f6b85', line: '#d9d6e6', split: '#efedf6',
    tipBg: 'rgba(255,255,255,0.96)', tipBorder: '#e6e4ef',
    heat: ['#f1eef9', '#ddd6fe', '#c4b5fd', '#a78bfa', '#7c3aed'],
  },
  dark: {
    text: '#ecebf5', muted: '#8c89a3', line: '#2e2b40', split: '#1d1b2a',
    tipBg: 'rgba(28,26,40,0.96)', tipBorder: '#34314a',
    heat: ['#211e30', '#3b2f6b', '#5b3fb0', '#7c4ddb', '#b197fc'],
  },
} as const;

export const SERIES_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b', '#10b981'];

export const heatColors = (theme: ResolvedTheme): string[] => [...TOKENS[theme].heat];

export function echartsTheme(theme: ResolvedTheme, fontFamily: string): object {
  const t = TOKENS[theme];
  const axis = {
    axisLine: { lineStyle: { color: t.line } },
    axisTick: { lineStyle: { color: t.line } },
    axisLabel: { color: t.muted },
    splitLine: { lineStyle: { color: t.split } },
    splitArea: { areaStyle: { color: ['transparent', t.split] } },
  };
  return {
    color: SERIES_COLORS,
    backgroundColor: 'transparent',
    textStyle: { fontFamily, color: t.text },
    legend: { textStyle: { color: t.muted } },
    tooltip: {
      backgroundColor: t.tipBg,
      borderColor: t.tipBorder,
      textStyle: { color: t.text },
      extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);backdrop-filter:blur(8px);',
    },
    categoryAxis: axis,
    valueAxis: axis,
    calendar: {
      dayLabel: { color: t.muted },
      monthLabel: { color: t.muted },
      itemStyle: { color: t.heat[0], borderColor: 'transparent' },
    },
    line: { smooth: true, symbolSize: 7, lineStyle: { width: 2.5 } },
  };
}
