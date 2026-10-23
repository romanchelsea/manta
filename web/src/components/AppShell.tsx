'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { AccountBar } from '@/components/AccountBar';
import { AccountsDialog } from '@/components/AccountsDialog';
import { TimeRangeSelect } from '@/components/TimeRangeSelect';
import { Button } from '@/components/ui/button';
import { useProfiles } from '@/hooks/useData';
import { useSync } from '@/hooks/useSync';
import { useSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Overview' },
  { href: '/matches', label: 'Matches' },
  { href: '/activity', label: 'Activity' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, update } = useSettings();
  const { syncAll, running, states, stage } = useSync();
  const profiles = useProfiles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const pathname = usePathname();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void syncAll(false);
  }, [syncAll]);

  const toggle = (id: string) =>
    update({
      ...settings,
      selected: settings.selected.includes(id)
        ? settings.selected.filter((a) => a !== id)
        : [...settings.selected, id],
    });

  let content: ReactNode = children;
  if (!settings.accounts.length) {
    content = (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <p className="text-lg">Add your Dota 2 accounts to get started.</p>
        <Button onClick={() => setDialogOpen(true)}>Add accounts</Button>
      </div>
    );
  } else if (!settings.selected.length) {
    content = <p className="py-24 text-center text-muted-foreground">Select at least one account.</p>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-4 border-b px-4 py-3">
        <span className="font-semibold">Dota 2 Multi-Account Tracker</span>
        <nav className="flex gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm hover:bg-muted',
                pathname === n.href && 'bg-muted font-medium',
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <TimeRangeSelect value={settings.range} onChange={(range) => update({ ...settings, range })} />
          <Button variant="outline" size="sm" onClick={() => void syncAll(true)} disabled={running}>
            <RefreshCw className={cn('size-4', running && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Manage accounts
          </Button>
        </div>
      </header>
      <AccountBar
        accounts={settings.accounts}
        selected={settings.selected}
        onToggle={toggle}
        profiles={profiles}
        states={states}
        stage={stage}
      />
      <main className="flex-1 p-4">{content}</main>
      <AccountsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
