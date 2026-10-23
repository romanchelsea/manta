'use client';
import { AppShell } from '@/components/AppShell';
import { useSummaries } from '@/hooks/useData';

// Temporary placeholder; the Overview page arrives in a later task.
export default function Home() {
  const rows = useSummaries();
  return (
    <AppShell>
      <p className="text-muted-foreground">{rows.length} matches in the selected range. Overview coming soon.</p>
    </AppShell>
  );
}
