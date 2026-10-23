'use client';
import type { ActivityWindow } from '@/lib/activity';

export const windowKey = (w: ActivityWindow): string => (w.kind === 'year' ? `year:${w.year}` : w.kind);
export function parseWindowKey(k: string): ActivityWindow {
  if (k.startsWith('year:')) return { kind: 'year', year: Number(k.slice(5)) };
  return k === 'all' ? { kind: 'all' } : { kind: 'last12' };
}

export function ActivityWindowSelect({
  value, years, onChange,
}: { value: ActivityWindow; years: number[]; onChange(w: ActivityWindow): void }) {
  return (
    <select
      aria-label="Activity window"
      className="h-8 rounded-md border bg-background px-2 text-sm"
      value={windowKey(value)}
      onChange={(e) => onChange(parseWindowKey(e.target.value))}
    >
      <option value="last12">Last 12 months</option>
      {years.map((y) => (
        <option key={y} value={`year:${y}`}>{y}</option>
      ))}
      <option value="all">All time</option>
    </select>
  );
}
