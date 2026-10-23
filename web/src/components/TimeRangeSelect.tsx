'use client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TimeRange } from '@/lib/filters';

const PRESETS = [7, 30, 90, 180, 365] as const;
const LABELS: Record<string, string> = {
  ...Object.fromEntries(PRESETS.map((d) => [String(d), `Last ${d} days`])),
  custom: 'Custom dates',
};

export function TimeRangeSelect({ value, onChange }: { value: TimeRange; onChange(r: TimeRange): void }) {
  const current = value.kind === 'preset' ? String(value.days) : 'custom';
  return (
    <div className="flex items-center gap-2">
      <Select
        value={current}
        onValueChange={(v) => {
          if (v === 'custom') onChange({ kind: 'custom', from: '', to: '' });
          else if (v) onChange({ kind: 'preset', days: Number(v) as (typeof PRESETS)[number] });
        }}
      >
        <SelectTrigger size="sm" aria-label="Time range" className="w-36">
          <SelectValue>{(v: string) => LABELS[v] ?? v}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[...PRESETS.map(String), 'custom'].map((v) => (
            <SelectItem key={v} value={v}>
              {LABELS[v]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.kind === 'custom' ? (
        <>
          <Input
            type="date"
            aria-label="From"
            className="h-8 w-36"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <Input
            type="date"
            aria-label="To"
            className="h-8 w-36"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </>
      ) : null}
    </div>
  );
}
