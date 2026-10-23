/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AccountId, AccountProfile, HeroInfo, ItemInfo, MatchDetail, MatchRecord, MatchSummary, PlayerDetail, Position,
} from '@/lib/types';

export interface OdPlayerMatch {
  match_id: number;
  player_slot: number;
  radiant_win: boolean;
  start_time: number;
  duration: number;
  hero_id?: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  game_mode?: number;
  lobby_type?: number;
  party_size?: number | null;
  lane_role?: number | null;
  is_roaming?: boolean | null;
  gold_per_min?: number | null;
  xp_per_min?: number | null;
  last_hits?: number | null;
  hero_damage?: number | null;
  tower_damage?: number | null;
}

export const RECORD_FIELDS = ['match_id', 'player_slot', 'radiant_win', 'start_time', 'duration'];
export const SUMMARY_FIELDS: string[] = [
  ...RECORD_FIELDS,
  'hero_id', 'kills', 'deaths', 'assists', 'game_mode', 'lobby_type', 'party_size', 'lane_role',
  'is_roaming', 'gold_per_min', 'xp_per_min', 'last_hits', 'hero_damage', 'tower_damage',
];

const n = (v: unknown): number | null => (typeof v === 'number' ? v : null);

export function estimatePosition(m: OdPlayerMatch): Position {
  if (m.lane_role == null) return 0;
  if (m.is_roaming) return 4;
  const lhpm = (m.last_hits ?? 0) / Math.max(1, m.duration / 60);
  const core = lhpm >= 3;
  switch (m.lane_role) {
    case 1: return core ? 1 : 5;
    case 2: return 2;
    case 3: return core ? 3 : 4;
    case 4: return core ? 1 : 4;
    default: return 0;
  }
}

export function toRecord(m: OdPlayerMatch, accountId: AccountId): MatchRecord {
  return {
    key: `${accountId}:${m.match_id}`,
    accountId,
    matchId: m.match_id,
    startTime: m.start_time,
    duration: m.duration,
    win: (m.player_slot < 128) === m.radiant_win,
  };
}

export function toSummary(m: OdPlayerMatch, accountId: AccountId): MatchSummary {
  return {
    ...toRecord(m, accountId),
    heroId: m.hero_id ?? 0,
    kills: m.kills ?? 0,
    deaths: m.deaths ?? 0,
    assists: m.assists ?? 0,
    gameMode: m.game_mode ?? 0,
    lobbyType: m.lobby_type ?? 0,
    partySize: m.party_size ?? null,
    position: estimatePosition(m),
    gpm: m.gold_per_min ?? null,
    xpm: m.xp_per_min ?? null,
    lastHits: m.last_hits ?? null,
    heroDamage: m.hero_damage ?? null,
    towerDamage: m.tower_damage ?? null,
  };
}

function toPlayer(p: any): PlayerDetail {
  return {
    accountId: n(p.account_id),
    name: p.personaname ?? p.name ?? null,
    rankTier: n(p.rank_tier),
    heroId: p.hero_id ?? 0,
    isRadiant: p.player_slot < 128,
    level: n(p.level),
    kills: p.kills ?? 0,
    deaths: p.deaths ?? 0,
    assists: p.assists ?? 0,
    lastHits: n(p.last_hits),
    denies: n(p.denies),
    gpm: n(p.gold_per_min),
    xpm: n(p.xp_per_min),
    netWorth: n(p.net_worth),
    heroDamage: n(p.hero_damage),
    towerDamage: n(p.tower_damage),
    heroHealing: n(p.hero_healing),
    items: [0, 1, 2, 3, 4, 5].map((i) => p[`item_${i}`] ?? 0),
    neutralItem: n(p.item_neutral),
  };
}

export function toDetail(raw: any): MatchDetail {
  return {
    matchId: raw.match_id,
    startTime: raw.start_time,
    duration: raw.duration,
    radiantWin: !!raw.radiant_win,
    gameMode: raw.game_mode ?? 0,
    lobbyType: raw.lobby_type ?? 0,
    radiantScore: raw.radiant_score ?? 0,
    direScore: raw.dire_score ?? 0,
    radiantGoldAdv: Array.isArray(raw.radiant_gold_adv) ? raw.radiant_gold_adv : null,
    radiantXpAdv: Array.isArray(raw.radiant_xp_adv) ? raw.radiant_xp_adv : null,
    players: (raw.players ?? []).map(toPlayer),
  };
}

export function toProfile(raw: any, accountId: AccountId): AccountProfile | null {
  if (!raw?.profile) return null;
  return {
    accountId,
    name: raw.profile.personaname ?? null,
    avatar: raw.profile.avatarfull ?? null,
    rankTier: n(raw.rank_tier),
  };
}

export function toHeroes(raw: any[]): Record<number, HeroInfo> {
  const out: Record<number, HeroInfo> = {};
  for (const h of raw) {
    out[h.id] = { id: h.id, name: h.localized_name, short: String(h.name).replace('npc_dota_hero_', '') };
  }
  return out;
}

export function toItems(raw: Record<string, any>): Record<number, ItemInfo> {
  const out: Record<number, ItemInfo> = {};
  for (const [key, it] of Object.entries(raw)) {
    if (it && typeof it.id === 'number') out[it.id] = { id: it.id, name: it.dname ?? key, img: it.img ?? '' };
  }
  return out;
}
