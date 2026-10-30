'use client';
import { useMemo, useState } from 'react';
import { Panel, TH } from '@/components/Panel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const [open, setOpen] = useState<MatchSummary | null>(null);

  const sorted = useMemo(() => {
    const f = VALUE[sort.key];
    return [...rows].sort((a, b) => (sort.desc ? f(b) - f(a) : f(a) - f(b)) || b.startTime - a.startTime);
  }, [rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const pageRows = sorted.slice(cur * PAGE, (cur + 1) * PAGE);

  const onSort = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: true }));
  };
  const go = (p: number) => setPage(p);
  const th = (label: string, key?: SortKey, right = false) => (
    <th
      className={`${TH} whitespace-nowrap ${right ? 'text-right' : 'text-left'} ${key ? 'cursor-pointer select-none transition-colors hover:text-foreground' : ''} ${key && sort.key === key ? 'text-primary' : ''}`}
      onClick={key ? () => onSort(key) : undefined}
      aria-sort={key && sort.key === key ? (sort.desc ? 'descending' : 'ascending') : undefined}
    >
      {label}
      {key && sort.key === key ? (sort.desc ? ' ▼' : ' ▲') : ''}
    </th>
  );

  return (
    <Panel title="Matches" description={`${rows.length} games · click a row for details`}>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
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
              const idx = accounts.indexOf(m.accountId);
              return (
                <tr
                  key={m.key}
                  data-match={m.key}
                  tabIndex={0}
                  aria-haspopup="dialog"
                  className="cursor-pointer border-b border-border/60 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-accent/60"
                  onClick={() => setOpen(m)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setOpen(m);
                    }
                  }}
                >
                  <td className="whitespace-nowrap px-2 py-1.5">{fmtTime(m.startTime)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: accountColor(idx) }} />
                    {nameOf(m.accountId)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <HeroImg heroes={heroes} id={m.heroId} className="h-5 w-9 rounded-sm shadow-sm" />
                      <span>{heroName(heroes, m.heroId)}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${m.win ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'}`}>
                      {m.win ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{m.kills}/{m.deaths}/{m.assists}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtDur(m.duration)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{MODE_NAMES[m.gameMode] ?? m.gameMode}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">{LOBBY_NAMES[m.lobbyType] ?? m.lobbyType}</td>
                  <td className="px-2 py-1.5">{m.position || '—'}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    {m.partySize == null ? '—' : m.partySize === 1 ? 'Solo' : `${m.partySize}-stack`}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{num(m.gpm)}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{num(m.xpm)}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums">{num(m.heroDamage)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <Button variant="outline" size="sm" disabled={cur === 0} onClick={() => go(cur - 1)}>
          Previous
        </Button>
        <span className="font-mono text-sm text-muted-foreground tabular-nums">{cur + 1} / {pages}</span>
        <Button variant="outline" size="sm" disabled={cur >= pages - 1} onClick={() => go(cur + 1)}>
          Next
        </Button>
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-8 text-base">
                  <HeroImg heroes={heroes} id={open.heroId} className="h-6 w-11 rounded-sm shadow-sm" />
                  {heroName(heroes, open.heroId)}
                  <span className="font-normal text-muted-foreground">· {nameOf(open.accountId)}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${open.win ? 'bg-win/15 text-win' : 'bg-loss/15 text-loss'}`}>
                    {open.win ? 'Win' : 'Loss'}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  K/D/A {open.kills}/{open.deaths}/{open.assists}
                </DialogDescription>
              </DialogHeader>
              <MatchDetailView matchId={open.matchId} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
