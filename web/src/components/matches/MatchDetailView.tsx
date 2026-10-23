'use client';
import { useMemo } from 'react';
import { EChart } from '@/components/charts/EChart';
import { HeroImg, heroName, type Heroes } from '@/components/overview/HeroImg';
import { fmtDur, fmtTime, num } from '@/components/overview/format';
import { useConstants } from '@/hooks/useData';
import { useMatchDetail } from '@/hooks/useMatchDetail';
import { LOBBY_NAMES, MODE_NAMES, itemImageUrl, rankName } from '@/lib/dota';
import { useSettings } from '@/lib/settings';
import type { ItemInfo, MatchDetail, PlayerDetail } from '@/lib/types';

type Items = Record<number, ItemInfo> | undefined;

function ItemIcon({ items, id, neutral }: { items: Items; id: number | null; neutral?: boolean }) {
  const shape = neutral ? 'size-6 rounded-full' : 'h-6 w-8 rounded-sm';
  const it = id ? items?.[id] : undefined;
  if (!it?.img) return <span className={`inline-block bg-muted ${shape}`} title={id ? `#${id}` : undefined} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={itemImageUrl(it.img)} alt={it.name} title={it.name} loading="lazy" className={shape} />;
}

function TeamTable({
  players, own, heroes, items,
}: { players: PlayerDetail[]; own: Set<string>; heroes: Heroes; items: Items }) {
  const H = ['Player', 'Hero', 'Level', 'K/D/A', 'LH/DN', 'GPM/XPM', 'Net worth', 'Hero dmg', 'Tower dmg', 'Healing', 'Items'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground">
          <tr className="border-b">
            {H.map((h, i) => (
              <th key={h} className={`px-2 py-1 font-medium ${i >= 2 && i <= 9 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => {
            const isOwn = p.accountId != null && own.has(String(p.accountId));
            const name = p.name || (p.accountId ? String(p.accountId) : 'Anonymous');
            return (
              <tr key={i} data-own={isOwn || undefined} className={`border-b ${isOwn ? 'bg-primary/10 font-medium' : ''}`}>
                <td className="whitespace-nowrap px-2 py-1">
                  {p.accountId ? (
                    <a href={`https://www.opendota.com/players/${p.accountId}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
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
                    {heroName(heroes, p.heroId)}
                  </span>
                </td>
                <td className="px-2 py-1 text-right tabular-nums">{p.level ?? '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">{p.kills}/{p.deaths}/{p.assists}</td>
                <td className="px-2 py-1 text-right tabular-nums">{p.lastHits ?? '—'}/{p.denies ?? '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">{p.gpm ?? '—'}/{p.xpm ?? '—'}</td>
                <td className="px-2 py-1 text-right tabular-nums">{num(p.netWorth)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{num(p.heroDamage)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{num(p.towerDamage)}</td>
                <td className="px-2 py-1 text-right tabular-nums">{num(p.heroHealing)}</td>
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
      </table>
    </div>
  );
}

function advOption(m: MatchDetail) {
  const gold = m.radiantGoldAdv ?? [];
  const series: object[] = [{ name: 'Gold advantage', type: 'line', showSymbol: false, data: gold }];
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
  if (isLoading || !m) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const link = 'hover:underline text-primary';
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <strong className="text-green-600 dark:text-green-400">Radiant {m.radiantScore}</strong> :{' '}
          <strong className="text-red-600 dark:text-red-400">{m.direScore} Dire</strong>
          <span className="ml-2 rounded px-1.5 py-0.5 text-xs bg-muted">{m.radiantWin ? 'Radiant victory' : 'Dire victory'}</span>
          <span className="text-muted-foreground">
            {' '}· {fmtDur(m.duration)} · {MODE_NAMES[m.gameMode] ?? m.gameMode} · {LOBBY_NAMES[m.lobbyType] ?? m.lobbyType} · {fmtTime(m.startTime)}
          </span>
        </div>
        <div className="text-muted-foreground">
          Match {m.matchId} ·{' '}
          <a className={link} href={`https://www.opendota.com/matches/${m.matchId}`} target="_blank" rel="noopener noreferrer">OpenDota</a> ·{' '}
          <a className={link} href={`https://stratz.com/matches/${m.matchId}`} target="_blank" rel="noopener noreferrer">STRATZ</a> ·{' '}
          <a className={link} href={`https://www.dotabuff.com/matches/${m.matchId}`} target="_blank" rel="noopener noreferrer">Dotabuff</a>
        </div>
      </div>
      <div className="font-semibold text-green-600 dark:text-green-400">Radiant</div>
      <TeamTable players={m.players.filter((p) => p.isRadiant)} own={own} heroes={consts?.heroes} items={consts?.items} />
      <div className="font-semibold text-red-600 dark:text-red-400">Dire</div>
      <TeamTable players={m.players.filter((p) => !p.isRadiant)} own={own} heroes={consts?.heroes} items={consts?.items} />
      {option && (
        <div>
          <div className="mt-2 text-sm text-muted-foreground">Gold / XP advantage (Radiant positive)</div>
          <EChart option={option} height={180} />
        </div>
      )}
    </div>
  );
}
