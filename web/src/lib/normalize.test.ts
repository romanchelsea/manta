import { describe, it, expect } from 'vitest';
import {
  estimatePosition, toRecord, toSummary, toDetail, toProfile, toHeroes, toItems, RECORD_FIELDS, SUMMARY_FIELDS,
  type OdPlayerMatch,
} from './normalize';

const base: OdPlayerMatch = { match_id: 7001, player_slot: 5, radiant_win: true, start_time: 1000, duration: 2400 };
const pm = (o: Partial<OdPlayerMatch>): OdPlayerMatch => ({ ...base, ...o });
const CORE = 200, SUP = 40;

describe('estimatePosition', () => {
  it('maps lanes', () => {
    expect(estimatePosition(pm({ lane_role: null, last_hits: CORE }))).toBe(0);
    expect(estimatePosition(pm({ is_roaming: true, lane_role: 1, last_hits: CORE }))).toBe(4);
    expect(estimatePosition(pm({ lane_role: 1, last_hits: CORE }))).toBe(1);
    expect(estimatePosition(pm({ lane_role: 1, last_hits: SUP }))).toBe(5);
    expect(estimatePosition(pm({ lane_role: 2, last_hits: SUP }))).toBe(2);
    expect(estimatePosition(pm({ lane_role: 3, last_hits: CORE }))).toBe(3);
    expect(estimatePosition(pm({ lane_role: 3, last_hits: SUP }))).toBe(4);
    expect(estimatePosition(pm({ lane_role: 4, last_hits: CORE }))).toBe(1);
    expect(estimatePosition(pm({ lane_role: 4, last_hits: SUP }))).toBe(4);
  });
});

describe('toRecord', () => {
  it('computes win and key', () => {
    expect(toRecord(pm({}), '42')).toMatchObject({ key: '42:7001', accountId: '42', matchId: 7001, win: true });
    expect(toRecord(pm({ player_slot: 130 }), '42').win).toBe(false);
  });
});

describe('toSummary', () => {
  it('handles nulls and defaults', () => {
    const s = toSummary(pm({ gold_per_min: null, party_size: null, lane_role: null }), '42');
    expect(s.gpm).toBeNull();
    expect(s.partySize).toBeNull();
    expect(s.position).toBe(0);
    expect([s.kills, s.deaths, s.assists]).toEqual([0, 0, 0]);
  });
});

describe('fields', () => {
  it('lists', () => {
    expect(RECORD_FIELDS).toEqual(['match_id', 'player_slot', 'radiant_win', 'start_time', 'duration']);
    expect(SUMMARY_FIELDS).toContain('tower_damage');
  });
});

describe('toDetail', () => {
  it('maps players', () => {
    const d = toDetail({
      match_id: 1, start_time: 2, duration: 3, radiant_win: true, radiant_score: 30, dire_score: 20,
      radiant_gold_adv: [0, 100],
      players: [
        { player_slot: 0, hero_id: 1, kills: 1, deaths: 2, assists: 3, item_0: 1, item_1: 2, item_2: 3, item_3: 4, item_4: 5, item_5: 6 },
        { player_slot: 128, hero_id: 2 },
      ],
    });
    expect(d.players[0].isRadiant).toBe(true);
    expect(d.players[1].isRadiant).toBe(false);
    expect(d.players[0].items).toEqual([1, 2, 3, 4, 5, 6]);
    expect(d.radiantScore).toBe(30);
    expect(d.radiantGoldAdv).toEqual([0, 100]);
    expect(d.radiantXpAdv).toBeNull();
    expect(toDetail({ players: [] }).radiantGoldAdv).toBeNull();
  });
});

describe('toProfile', () => {
  it('maps', () => {
    expect(toProfile({ profile: { personaname: 'A', avatarfull: 'u' }, rank_tier: 45 }, '1')).toEqual({ accountId: '1', name: 'A', avatar: 'u', rankTier: 45 });
    expect(toProfile({}, '1')).toBeNull();
  });
});

describe('constants', () => {
  it('heroes', () => {
    const h = toHeroes([{ id: 1, localized_name: 'Anti-Mage', name: 'npc_dota_hero_antimage' }]);
    expect(h[1].short).toBe('antimage');
    expect(h[1].name).toBe('Anti-Mage');
  });
  it('items', () => {
    const i = toItems({ blink: { id: 1, dname: 'Blink Dagger', img: '/x.png' }, bad: { dname: 'x' } });
    expect(Object.keys(i)).toEqual(['1']);
    expect(i[1]).toEqual({ id: 1, name: 'Blink Dagger', img: '/x.png' });
  });
});
