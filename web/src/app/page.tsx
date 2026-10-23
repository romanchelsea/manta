'use client';
import { AppShell } from '@/components/AppShell';
import { AccountTable } from '@/components/overview/AccountTable';
import { HeroGrid } from '@/components/overview/HeroGrid';
import { KpiRow } from '@/components/overview/KpiRow';
import { PartyTable } from '@/components/overview/PartyTable';
import { PositionBars } from '@/components/overview/PositionBars';
import { RecentStrip } from '@/components/overview/RecentStrip';
import { useConstants, useProfiles, useSummaries } from '@/hooks/useData';
import { useSettings } from '@/lib/settings';

export default function Home() {
  const rows = useSummaries();
  const profiles = useProfiles();
  const heroes = useConstants()?.heroes;
  const { settings } = useSettings();
  const nameOf = (id: string) => profiles[id]?.profile?.name ?? id;
  return (
    <AppShell>
      {!rows.length ? (
        <p className="py-16 text-center text-muted-foreground">No matches in this time range.</p>
      ) : (
        <div className="space-y-3">
          <KpiRow rows={rows} />
          <AccountTable rows={rows} accounts={settings.accounts} profiles={profiles} heroes={heroes} />
          <div className="grid gap-3 md:grid-cols-2">
            <PositionBars rows={rows} />
            <div className="rounded-lg border p-3">
              <PartyTable rows={rows} />
              <RecentStrip rows={rows} heroes={heroes} nameOf={nameOf} />
            </div>
          </div>
          <HeroGrid rows={rows} heroes={heroes} />
        </div>
      )}
    </AppShell>
  );
}
