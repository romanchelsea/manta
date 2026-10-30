import type { MatchSummary } from '@/lib/types';
import { cn } from '@/lib/utils';
import { heroName, type Heroes } from './HeroImg';

const fmtTime = (sec: number) => new Date(sec * 1000).toLocaleString('en-GB', { hour12: false });

export function RecentStrip({
  rows, heroes, nameOf,
}: { rows: MatchSummary[]; heroes: Heroes; nameOf: (id: string) => string }) {
  const recent = rows.slice(0, 40).reverse();
  return (
    <div>
      <h3 className="mb-2 mt-5 text-sm font-semibold">Last {recent.length} matches</h3>
      <div className="flex flex-wrap gap-1">
        {recent.map((m) => (
          <span key={m.key}
            title={`${fmtTime(m.startTime)}\n${nameOf(m.accountId)} · ${heroName(heroes, m.heroId)}\n${m.win ? 'Win' : 'Loss'} ${m.kills}/${m.deaths}/${m.assists}`}
            className={cn('inline-flex size-6 cursor-default items-center justify-center rounded-md text-xs font-semibold ring-1 ring-inset transition-transform hover:scale-125',
              m.win ? 'bg-win/15 text-win ring-win/30' : 'bg-loss/15 text-loss ring-loss/30')}>
            {m.win ? 'W' : 'L'}
          </span>
        ))}
      </div>
    </div>
  );
}
