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
      <h3 className="mb-2 mt-4 font-medium">Last {recent.length} matches</h3>
      <div className="flex flex-wrap gap-1">
        {recent.map((m) => (
          <span key={m.key}
            title={`${fmtTime(m.startTime)}\n${nameOf(m.accountId)} · ${heroName(heroes, m.heroId)}\n${m.win ? 'Win' : 'Loss'} ${m.kills}/${m.deaths}/${m.assists}`}
            className={cn('inline-flex size-6 items-center justify-center rounded text-xs font-medium text-white',
              m.win ? 'bg-green-600' : 'bg-red-600')}>
            {m.win ? 'W' : 'L'}
          </span>
        ))}
      </div>
    </div>
  );
}
