import { heroImageUrl } from '@/lib/dota';
import type { HeroInfo } from '@/lib/types';

export type Heroes = Record<number, HeroInfo> | undefined;

export function HeroImg({ heroes, id, className }: { heroes: Heroes; id: number; className?: string }) {
  const h = heroes?.[id];
  if (!h) return <span className={className} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={heroImageUrl(h.short)} alt="" loading="lazy" className={className} />;
}
export const heroName = (heroes: Heroes, id: number): string => heroes?.[id]?.name ?? `Hero ${id}`;
