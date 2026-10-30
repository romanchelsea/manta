'use client';
import { Monitor, Moon, Sun } from 'lucide-react';
import { setThemePref, useThemePref, type ThemePref } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System theme', Icon: Monitor },
  { value: 'light', label: 'Light theme', Icon: Sun },
  { value: 'dark', label: 'Dark theme', Icon: Moon },
];

export function ThemeToggle() {
  const pref = useThemePref();
  return (
    <div role="group" aria-label="Theme" className="flex items-center rounded-full border bg-muted/60 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={pref === value}
          title={label}
          onClick={() => setThemePref(value)}
          className={cn(
            'grid size-6 place-items-center rounded-full text-muted-foreground transition-all hover:text-foreground',
            pref === value && 'bg-background text-foreground shadow-sm',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
