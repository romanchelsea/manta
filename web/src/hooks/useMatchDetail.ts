'use client';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/db';
import { toDetail } from '@/lib/normalize';
import { createOpenDotaClient } from '@/lib/opendota';
import { useSettings } from '@/lib/settings';
import { DAY, DETAIL_DAYS } from '@/lib/sync';
import type { MatchDetail } from '@/lib/types';

export function useMatchDetail(matchId: number | null): { data?: MatchDetail; isLoading: boolean; error: Error | null } {
  const { settings } = useSettings();
  const client = useMemo(() => createOpenDotaClient({ apiKey: settings.apiKey || undefined }), [settings.apiKey]);
  const q = useQuery({
    queryKey: ['match', matchId],
    enabled: matchId != null,
    retry: false,
    staleTime: Infinity,
    queryFn: async (): Promise<MatchDetail> => {
      const id = matchId as number;
      const cached = await db.details.get(id);
      if (cached) {
        const { fetchedAt: _f, ...detail } = cached;
        void _f;
        return detail;
      }
      const detail = toDetail(await client.get<unknown>(`/matches/${id}`));
      if (detail.players.length > 0 && detail.startTime >= Date.now() / 1000 - DETAIL_DAYS * DAY) {
        await db.details.put({ ...detail, fetchedAt: Date.now() });
      }
      return detail;
    },
  });
  return { data: q.data, isLoading: q.isLoading, error: q.error };
}
