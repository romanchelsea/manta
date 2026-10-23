'use client';
import { AppShell } from '@/components/AppShell';
import { MatchTable } from '@/components/matches/MatchTable';
import { useConstants, useProfiles, useSummaries } from '@/hooks/useData';
import { useSettings } from '@/lib/settings';

export default function MatchesPage() {
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
        <MatchTable rows={rows} accounts={settings.accounts} nameOf={nameOf} heroes={heroes} />
      )}
    </AppShell>
  );
}
