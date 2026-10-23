export type AccountId = string; // Steam32 account id as decimal string
export type Position = 0 | 1 | 2 | 3 | 4 | 5; // 0 = unknown

// key = `${accountId}:${matchId}`, times in unix seconds
export interface MatchRecord {
  key: string;
  accountId: AccountId;
  matchId: number;
  startTime: number;
  duration: number;
  win: boolean;
}

export interface MatchSummary extends MatchRecord {
  heroId: number;
  kills: number;
  deaths: number;
  assists: number;
  gameMode: number;
  lobbyType: number;
  partySize: number | null;
  position: Position;
  gpm: number | null;
  xpm: number | null;
  lastHits: number | null;
  heroDamage: number | null;
  towerDamage: number | null;
}

// items: 6 slots, 0 = empty
export interface PlayerDetail {
  accountId: number | null;
  name: string | null;
  rankTier: number | null;
  heroId: number;
  isRadiant: boolean;
  level: number | null;
  kills: number;
  deaths: number;
  assists: number;
  lastHits: number | null;
  denies: number | null;
  gpm: number | null;
  xpm: number | null;
  netWorth: number | null;
  heroDamage: number | null;
  towerDamage: number | null;
  heroHealing: number | null;
  items: number[];
  neutralItem: number | null;
}

export interface MatchDetail {
  matchId: number;
  startTime: number;
  duration: number;
  radiantWin: boolean;
  gameMode: number;
  lobbyType: number;
  radiantScore: number;
  direScore: number;
  radiantGoldAdv: number[] | null;
  radiantXpAdv: number[] | null;
  players: PlayerDetail[];
}

export interface AccountProfile {
  accountId: AccountId;
  name: string | null;
  avatar: string | null;
  rankTier: number | null;
}

// short = npc name without "npc_dota_hero_"
export interface HeroInfo {
  id: number;
  name: string;
  short: string;
}

// img = CDN path from OpenDota constants
export interface ItemInfo {
  id: number;
  name: string;
  img: string;
}
