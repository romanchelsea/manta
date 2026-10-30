'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { HeatmapChart, LineChart } from 'echarts/charts';
import {
  CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useResolvedTheme } from '@/lib/theme';
import { echartsTheme } from './palette';

echarts.use([
  LineChart, HeatmapChart, CalendarComponent, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent,
  CanvasRenderer,
]);

export interface EChartProps {
  option: echarts.EChartsCoreOption;
  height: number;
}

export default function EChartImpl({ option, height }: EChartProps) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const latest = useRef(option);
  const theme = useResolvedTheme();
  // ECharts themes are fixed at init, so a theme switch rebuilds the chart.
  useEffect(() => {
    if (!el.current) return;
    const c = echarts.init(el.current, echartsTheme(theme, getComputedStyle(document.body).fontFamily));
    c.setOption(latest.current, true);
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, [theme]);
  useEffect(() => {
    latest.current = option;
    chart.current?.setOption(option, true);
  }, [option]);
  return <div ref={el} style={{ height, width: '100%' }} />;
}
