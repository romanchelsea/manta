'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { HeatmapChart, LineChart } from 'echarts/charts';
import {
  CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

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
  useEffect(() => {
    if (!el.current) return;
    const c = echarts.init(el.current);
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);
  useEffect(() => {
    chart.current?.setOption(option, true);
  }, [option]);
  return <div ref={el} style={{ height, width: '100%' }} />;
}
