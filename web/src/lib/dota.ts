import type { Position } from './types';

const CDN = 'https://cdn.cloudflare.steamstatic.com';

export const MODE_NAMES: Record<number, string> = {
  0: 'Unknown', 1: 'All Pick', 2: "Captains Mode", 3: 'Random Draft', 4: 'Single Draft', 5: 'All Random',
  6: 'Intro', 7: 'Diretide', 8: 'Reverse Captains Mode', 9: 'Greeviling', 10: 'Tutorial', 11: 'Mid Only',
  12: 'Least Played', 13: 'Limited Heroes', 14: 'Compendium Matchmaking', 15: 'Custom', 16: 'Captains Draft',
  17: 'Balanced Draft', 18: 'Ability Draft', 19: 'Event', 20: 'All Random Deathmatch', 21: '1v1 Mid',
  22: 'All Pick', 23: 'Turbo', 24: 'Mutation', 25: 'Coaches Challenge',
};

export const LOBBY_NAMES: Record<number, string> = {
  0: 'Normal', 1: 'Practice', 2: 'Tournament', 3: 'Tutorial', 4: 'Co-op Bots', 5: 'Team Ranked',
  6: 'Solo Ranked', 7: 'Ranked', 8: '1v1 Mid', 9: 'Battle Cup', 10: 'Local Bots', 11: 'Spectator',
  12: 'Event', 13: 'Gauntlet', 14: 'New Player', 15: 'Featured',
};

export const POSITION_NAMES: Record<Position, string> = {
  0: 'Unknown',
  1: 'Pos 1 · Carry',
  2: 'Pos 2 · Mid',
  3: 'Pos 3 · Offlane',
  4: 'Pos 4 · Soft Support',
  5: 'Pos 5 · Hard Support',
};

const MEDALS = ['', 'Herald', 'Guardian', 'Crusader', 'Archon', 'Legend', 'Ancient', 'Divine', 'Immortal'];

export function rankName(rankTier: number | null | undefined): string {
  if (!rankTier) return 'Unranked';
  const medal = Math.floor(rankTier / 10);
  const star = rankTier % 10;
  if (!MEDALS[medal]) return String(rankTier);
  return medal < 8 && star ? `${MEDALS[medal]} ${star}` : MEDALS[medal];
}

export const heroImageUrl = (short: string): string =>
  `${CDN}/apps/dota2/images/dota_react/heroes/${short}.png`;

export const itemImageUrl = (img: string): string => `${CDN}${img}`;

export const kda = (k: number, d: number, a: number): number => (k + a) / Math.max(1, d);
