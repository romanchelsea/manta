import { MODE_NAMES, LOBBY_NAMES, POSITION_NAMES, rankName, heroImageUrl, itemImageUrl, kda } from './dota';

test('rankName', () => {
  expect(rankName(null)).toBe('Unranked');
  expect(rankName(45)).toBe('Archon 5');
  expect(rankName(55)).toBe('Legend 5');
  expect(rankName(80)).toBe('Immortal');
  expect(rankName(81)).toBe('Immortal');
});
test('constants and helpers', () => {
  expect(POSITION_NAMES[0]).toBe('Unknown');
  expect(POSITION_NAMES[1]).toBe('Pos 1 · Carry');
  expect(heroImageUrl('antimage')).toBe('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/antimage.png');
  expect(itemImageUrl('/apps/dota2/images/dota_react/items/blink.png?t=1')).toBe('https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/blink.png?t=1');
  expect(kda(10, 0, 5)).toBe(15);
  expect(MODE_NAMES[22]).toBe('All Pick');
  expect(LOBBY_NAMES[7]).toBe('Ranked');
});
