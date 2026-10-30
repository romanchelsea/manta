import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  title, description, action, className, children,
}: { title?: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition-shadow duration-300 hover:shadow-md',
        className,
      )}
    >
      {title || action ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A KPI tile. The value comes first in the DOM; the label is shown above it. */
export function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: 'win' | 'loss' | 'brand' }) {
  return (
    <div className="flex min-w-0 flex-col-reverse rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div
        className={cn(
          'mt-1 truncate text-xl font-semibold tracking-tight tabular-nums xl:text-2xl',
          tone === 'win' && 'text-win',
          tone === 'loss' && 'text-loss',
          tone === 'brand' && 'text-gradient',
        )}
      >
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-xl bg-muted', className)} />;
}

export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
      <Skeleton className="h-48" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

export const TH = 'px-2 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground';
export const TR = 'border-t border-border/60 transition-colors hover:bg-muted/50';
