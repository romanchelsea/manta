'use client';
import dynamic from 'next/dynamic';
import type { EChartProps } from './EChartImpl';

const Impl = dynamic(() => import('./EChartImpl'), { ssr: false });

export function EChart(props: EChartProps) {
  return <Impl {...props} />;
}
