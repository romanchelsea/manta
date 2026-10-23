'use client';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ActivityWindowSelect } from '@/components/activity/ActivityWindowSelect';
import { CalendarHeatmap } from '@/components/activity/CalendarHeatmap';
import { NthGameChart } from '@/components/activity/NthGameChart';
import { WeekdayTable } from '@/components/activity/WeekdayTable';
import { WeekHourHeatmap } from '@/components/activity/WeekHourHeatmap';
import { fix } from '@/components/overview/format';
import { useRecords } from '@/hooks/useData';
import {
  activityKpis, availableYears, calendarEnd, nthGameOfDay, weekdayHourGrid, windowBounds, type ActivityWindow,
} from '@/lib/activity';

const hmm = (sec: number) => {
  const m = Math.round(sec / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {children}
    </div>
  );
}

export default function ActivityPage() {
  const all = useRecords();
  const [win, setWin] = useState<ActivityWindow>({ kind: 'last12' });
  const years = useMemo(() => availableYears(all), [all]);
  const d = useMemo(() => {
    // Records only load client-side; skip `new Date()` during prerender.
    if (!all.length) return null;
    const now = new Date();
    const [from, to] = windowBounds(win, now);
    const records = all.filter((r) => r.startTime >= from && r.startTime <= to);
    return {
      records,
      end: calendarEnd(win, now),
      kpis: activityKpis(records),
      grid: weekdayHourGrid(records),
      nth: nthGameOfDay(records),
    };
  }, [all, win]);
  const calTitle =
    win.kind === 'year' ? `Daily activity (${win.year})` : 'Daily activity (last 12 months)';
  const k = d?.kpis ?? activityKpis([]);
  const kpis: [string, string | number][] = [
    ['Active days', k.activeDays],
    ['Games per active day', fix(k.gamesPerActiveDay)],
    ['Games per week', fix(k.gamesPerWeek)],
    ['Total playtime (h:mm)', hmm(k.totalSeconds)],
  ];
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Lifetime history. The header time range does not apply here.
          </p>
          <ActivityWindowSelect value={win} years={years} onChange={setWin} />
        </div>
        {!d || !d.records.length ? (
          <p className="py-16 text-center text-muted-foreground">No matches in this window.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map(([l, v]) => (
                <div key={l} className="rounded-lg border p-3">
                  <div className="text-xl font-semibold tabular-nums">{v}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            <Card title={calTitle}>
              <CalendarHeatmap records={d.records} end={d.end} />
            </Card>
            <Card title="Weekday × hour">
              <WeekHourHeatmap grid={d.grid} />
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              <Card title="By weekday">
                <WeekdayTable grid={d.grid} />
              </Card>
              <Card title="Win rate by nth game of the day (same account)">
                <NthGameChart nth={d.nth} />
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
