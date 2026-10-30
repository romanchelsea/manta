'use client';
import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { EChart } from '@/components/charts/EChart';
import { Skeleton, TH } from '@/components/Panel';
import { HeroImg, heroName, type Heroes } from '@/components/overview/HeroImg';
import { fmtDur, fmtTime, num } from '@/components/overview/format';
import { useConstants } from '@/hooks/useData';
import { useMatchDetail } from '@/hooks/useMatchDetail';
import { LOBBY_NAMES, MODE_NAMES, itemImageUrl, rankName } from '@/lib/dota';
import { useSettings } from '@/lib/settings';
import type { ItemInfo, MatchDetail, PlayerDetail } from '@/lib/types';

type Items = Record<number, ItemInfo> | undefined;

const EXTERNAL = [
  { label: 'OpenDota', url: (id: number) => `https://www.opendota.com/matches/${id}` },
  { label: 'STRATZ', url: (id: number) => `https://stratz.com/matches/${id}` },
  { label: 'Dotabuff', url: (id: number) => `https://www.dotabuff.com/matches/${id}` },
];

function ItemIcon({ items, id, neutral }: { items: Items; id: number | null; neutral?: boolean }) {
  const shape = neutral ? 'size-6 rounded-full' : 'h-6 w-8 rounded-sm';
  const it = id ? items?.[id] : undefined;
  if (!it?.img) return <span className={`inline-block bg-muted ${shape}`} title={id ? `#${id}` : undefined} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={itemImageUrl(it.img)} alt={it.name} title={it.name} loading="lazy" className={shape} />;
}

const TEAMS = [
  { radiant: true, label: 'Radiant', tone: 'text-win' },
  { radiant: false, label: 'Dire', tone: 'text-loss' },
] as const;

/** Both teams share one table so their columns line up. */
function PlayersTable({
  players, own, heroes, items,
}: { players: PlayerDetail[]; own: Set<string>; heroes: Heroes; items: Items }) {
  const H = ['Player', 'Hero', 'Level', 'K/D/A', 'LH/DN', 'GPM/XPM', 'Net worth', 'Hero dmg', 'Tower dmg', 'Healing', 'Items'];
  const [col, setCol] = useState<number | null>(null);
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-sm"
        onMouseOver={(e) => {
          const cell = (e.target as HTMLElement).closest('td, th') as HTMLTableCellElement | null;
          setCol(cell && cell.colSpan === 1 ? cell.cellIndex : null);
        }}
        onMouseLeave={() => setCol(null)}
      >
        {/* The hovered column is tinted through <col>; the hovered row tints on top of it. */}
        <colgroup>
          {H.map((h, j) => <col key={h} className={col === j ? 'bg-primary/10' : undefined} />)}
        </colgroup>
        <thead>
          <tr className="border-b">
            {H.map((h, i) => (
              <th key={h} className={`${TH} whitespace-nowrap ${i >= 2 && i <= 9 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        {TEAMS.map(({ radiant, label, tone }) => (
          <tbody key={label}>
            <tr>
              <th colSpan={H.length} className={`bg-popover px-2 pt-4 pb-1 text-left text-sm font-semibold ${tone}`}>{label}</th>
            </tr>
            {players.filter((p) => p.isRadiant === radiant).map((p, i) => {
              const isOwn = p.accountId != null && own.has(String(p.accountId));
              const name = p.name || (p.accountId ? String(p.accountId) : 'Anonymous');
              return (
                <tr key={i} data-own={isOwn || undefined} className={`border-b border-border/60 transition-colors hover:bg-primary/15 ${isOwn ? 'bg-primary/10 font-medium' : ''}`}>
                  <td className="whitespace-nowrap px-2 py-1">
                    {p.accountId ? (
                      <a href={`https://www.opendota.com/players/${p.accountId}`} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary hover:underline">
                        {name}
                      </a>
                    ) : (
                      name
                    )}
                    {p.rankTier ? <span className="ml-1 text-xs text-muted-foreground">{rankName(p.rankTier)}</span> : null}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">
                    <span className="inline-flex items-center gap-1.5">
                      <HeroImg heroes={heroes} id={p.heroId} className="h-5 w-9 rounded-sm" />
                      <span>{heroName(heroes, p.heroId)}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{p.level ?? '—'}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{p.kills}/{p.deaths}/{p.assists}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{p.lastHits ?? '—'}/{p.denies ?? '—'}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{p.gpm ?? '—'}/{p.xpm ?? '—'}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{num(p.netWorth)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{num(p.heroDamage)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{num(p.towerDamage)}</td>
                  <td className="px-2 py-1 text-right font-mono tabular-nums">{num(p.heroHealing)}</td>
                  <td className="whitespace-nowrap px-2 py-1">
                    <span className="inline-flex items-center gap-0.5">
                      {p.items.map((id, j) => <ItemIcon key={j} items={items} id={id} />)}
                      <span className="ml-1"><ItemIcon items={items} id={p.neutralItem} neutral /></span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function advOption(m: MatchDetail) {
  const gold = m.radiantGoldAdv ?? [];
  const series: object[] = [{ name: 'Gold advantage', type: 'line', showSymbol: false, areaStyle: { opacity: 0.1 }, data: gold }];
  if (m.radiantXpAdv?.length) series.push({ name: 'XP advantage', type: 'line', showSymbol: false, data: m.radiantXpAdv });
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 48, right: 16, top: 28, bottom: 24 },
    xAxis: { type: 'category', data: gold.map((_, i) => `${i}m`) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)) },
    },
    series,
  };
}

export function MatchDetailView({ matchId }: { matchId: number }) {
  const { data: m, isLoading, error } = useMatchDetail(matchId);
  const consts = useConstants();
  const { settings } = useSettings();
  const own = useMemo(() => new Set(settings.accounts), [settings.accounts]);
  const option = useMemo(() => (m && (m.radiantGoldAdv?.length ?? 0) > 1 ? advOption(m) : null), [m]);

  if (error) return <p className="text-sm text-destructive">Failed to load match: {error.message}</p>;
  if (isLoading || !m)
    return (
      <div role="status" aria-label="Loading match" className="space-y-2">
        <Skeleton className="h-5 w-2/3 rounded-md" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <strong className="font-mono text-win">Radiant {m.radiantScore}</strong> :{' '}
          <strong className="font-mono text-loss">{m.direScore} Dire</strong>
          <span className="ml-2 rounded-md bg-accent px-1.5 py-0.5 text-xs font-medium text-accent-foreground">{m.radiantWin ? 'Radiant victory' : 'Dire victory'}</span>
          <span className="text-muted-foreground">
            {' '}· {fmtDur(m.duration)} · {MODE_NAMES[m.gameMode] ?? m.gameMode} · {LOBBY_NAMES[m.lobbyType] ?? m.lobbyType} · {fmtTime(m.startTime)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">Match {m.matchId}</span>
          {EXTERNAL.map(({ label, url }) => (
            <a
              key={label}
              href={url(m.matchId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground shadow-sm transition-all hover:-translate-y-px hover:border-primary/60 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:shadow-primary/30"
            >
              {label}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ))}
        </div>
      </div>
      <PlayersTable players={m.players} own={own} heroes={consts?.heroes} items={consts?.items} />
      {option && (
        <div>
          <div className="mt-2 text-sm text-muted-foreground">Gold / XP advantage (Radiant positive)</div>
          <EChart option={option} height={180} />
        </div>
      )}
    </div>
  );
}
