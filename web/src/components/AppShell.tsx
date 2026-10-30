'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { AccountBar } from '@/components/AccountBar';
import { AccountsDialog } from '@/components/AccountsDialog';
import { MantaAxe, MantaMark } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
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
        <MantaAxe className="size-24 drop-shadow-[0_8px_24px_rgb(139_92_246/0.35)]" />
        <div>
          <p className="text-xl font-semibold">Add your Dota 2 accounts to get started.</p>
          <p className="mt-1 text-sm text-muted-foreground">See combined stats across all of them in one place.</p>
        </div>
        <Button size="lg" onClick={() => setDialogOpen(true)}>Add accounts</Button>
      </div>
    );
  } else if (!settings.selected.length) {
    content = <p className="py-24 text-center text-muted-foreground">Select at least one account.</p>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="z-40 border-b md:sticky md:top-0 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <MantaMark className="size-7 rounded-lg shadow-sm shadow-primary/40" />
            <span className="text-lg">Manta</span>
            <span className="hidden text-xs font-normal text-muted-foreground xl:inline">every Dota 2 account you own, in one view</span>
          </Link>
          <nav className="order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:w-auto">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  pathname === n.href && 'bg-accent font-medium text-accent-foreground hover:bg-accent hover:text-accent-foreground',
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
            <ThemeToggle />
          </div>
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
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-4 pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {content}
      </main>
      <AccountsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
