'use client';
import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HeroImg, heroName, type Heroes } from '@/components/overview/HeroImg';
import { fmtDur, fmtTime, num } from '@/components/overview/format';
import { accountColor } from '@/hooks/useData';
import { MatchDetailView } from '@/components/matches/MatchDetailView';
import { LOBBY_NAMES, MODE_NAMES, kda } from '@/lib/dota';
import type { AccountId, MatchSummary } from '@/lib/types';

const PAGE = 50;
type SortKey = 'time' | 'kda' | 'duration' | 'gpm' | 'xpm' | 'damage';
const VALUE: Record<SortKey, (m: MatchSummary) => number> = {
  time: (m) => m.startTime,
  kda: (m) => kda(m.kills, m.deaths, m.assists),
  duration: (m) => m.duration,
  gpm: (m) => m.gpm ?? -1,
  xpm: (m) => m.xpm ?? -1,
  damage: (m) => m.heroDamage ?? -1,
};

export function MatchTable({
  rows, accounts, nameOf, heroes,
}: { rows: MatchSummary[]; accounts: AccountId[]; nameOf: (id: AccountId) => string; heroes: Heroes }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'time', desc: true });
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const f = VALUE[sort.key];
    return [...rows].sort((a, b) => (sort.desc ? f(b) - f(a) : f(a) - f(b)) || b.startTime - a.startTime);
  }, [rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const pageRows = sorted.slice(cur * PAGE, (cur + 1) * PAGE);

  const onSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));
    setExpanded(null);
  };
  const go = (p: number) => {
    setPage(p);
    setExpanded(null);
  };
  const th = (label: string, key?: SortKey, right = false) => (
    <th
      className={`px-2 py-1.5 font-medium ${right ? 'text-right' : 'text-left'} ${key ? 'cursor-pointer select-none hover:text-foreground' : ''}`}
      onClick={key ? () => onSort(key) : undefined}
      aria-sort={key && sort.key === key ? (sort.desc ? 'descending' : 'ascending') : undefined}
    >
      {label}
      {key && sort.key === key ? (sort.desc ? ' ▼' : ' ▲') : ''}
    </th>
  );

  return (
    <div className="rounded-lg border p-3">
      <h3 className="mb-2 font-semibold">
        Matches <span className="text-sm font-normal text-muted-foreground">{rows.length} games · click a row for details</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              {th('Time', 'time')}
              {th('Account')}
              {th('Hero')}
              {th('Result')}
              {th('K/D/A', 'kda', true)}
              {th('Duration', 'duration', true)}
              {th('Mode')}
              {th('Lobby')}
              {th('Position')}
              {th('Party')}
              {th('GPM', 'gpm', true)}
              {th('XPM', 'xpm', true)}
              {th('Damage', 'damage', true)}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m) => {
              const open = expanded === m.key;
              const idx = accounts.indexOf(m.accountId);
              return (
                <Fragment key={m.key}>
                  <tr
                    data-match={m.key}
                    className={`cursor-pointer border-b hover:bg-muted/50 ${open ? 'bg-muted/50' : ''}`}
                    onClick={() => setExpanded(open ? null : m.key)}
                  >
                    <td className="whitespace-nowrap px-2 py-1">{fmtTime(m.startTime)}</td>
                    <td className="whitespace-nowrap px-2 py-1">
                      <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: accountColor(idx) }} />
                      {nameOf(m.accountId)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1">
                      <span className="inline-flex items-center gap-1.5">
                        <HeroImg heroes={heroes} id={m.heroId} className="h-5 w-9 rounded-sm" />
                        {heroName(heroes, m.heroId)}
                      </span>
                    </td>
                    <td className="px-2 py-1">
                      <span className={m.win ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {m.win ? 'Win' : 'Loss'}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{m.kills}/{m.deaths}/{m.assists}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtDur(m.duration)}</td>
                    <td className="whitespace-nowrap px-2 py-1">{MODE_NAMES[m.gameMode] ?? m.gameMode}</td>
                    <td className="whitespace-nowrap px-2 py-1">{LOBBY_NAMES[m.lobbyType] ?? m.lobbyType}</td>
                    <td className="px-2 py-1">{m.position || '—'}</td>
                    <td className="whitespace-nowrap px-2 py-1">
                      {m.partySize == null ? '—' : m.partySize === 1 ? 'Solo' : `${m.partySize}-stack`}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums">{num(m.gpm)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{num(m.xpm)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{num(m.heroDamage)}</td>
                  </tr>
                  {open && (
                    <tr className="border-b">
                      <td colSpan={13} className="bg-muted/20 p-3">
                        <MatchDetailView matchId={m.matchId} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => go(cur - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">{cur + 1} / {pages}</span>
        <Button variant="outline" size="sm" disabled={cur >= pages - 1} onClick={() => go(cur + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
