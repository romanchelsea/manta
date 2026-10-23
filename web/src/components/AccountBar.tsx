'use client';
import { Loader2 } from 'lucide-react';
import type { SyncState } from '@/lib/db';
import { rankName } from '@/lib/dota';
import type { SyncStage } from '@/lib/sync';
import type { AccountId } from '@/lib/types';
import { accountColor } from '@/hooks/useData';
import { cn } from '@/lib/utils';

const STAGE_LABEL: Record<SyncStage, string> = {
  profile: 'Loading profile…',
  records: 'Loading match history…',
  summaries: 'Loading match details…',
  done: 'Done',
};

export interface AccountBarProps {
  accounts: AccountId[];
  selected: AccountId[];
  onToggle(id: AccountId): void;
  profiles: Record<AccountId, SyncState>;
  states: Record<AccountId, SyncState | undefined>;
  stage: Record<AccountId, SyncStage | undefined>;
}

export function AccountBar({ accounts, selected, onToggle, profiles, states, stage }: AccountBarProps) {
  if (!accounts.length) return null;
  return (
    <div className="flex flex-wrap gap-2 border-b px-4 py-3">
      {accounts.map((id, i) => {
        const st = states[id] ?? profiles[id];
        const profile = st?.profile ?? null;
        const isSelected = selected.includes(id);
        const s = stage[id];
        return (
          <div key={id} className="flex max-w-xs flex-col gap-1">
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(id)}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
                isSelected ? 'bg-secondary text-secondary-foreground' : 'opacity-50 hover:opacity-80',
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: accountColor(i) }} />
              {profile?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt="" className="size-5 rounded-full" />
              ) : null}
              <span className="truncate font-medium">{profile?.name || id}</span>
              {profile ? <span className="text-xs text-muted-foreground">{rankName(profile.rankTier)}</span> : null}
              {s ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                  {STAGE_LABEL[s]}
                </span>
              ) : null}
            </button>
            {st?.error ? <p className="px-3 text-xs text-destructive">{st.error}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
