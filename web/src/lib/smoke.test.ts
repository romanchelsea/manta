import { expect, it } from 'vitest'
import { cn } from '@/lib/utils'

it('runs with TZ=Asia/Shanghai', () => {
  // 2026-03-02T16:30Z is 2026-03-03 00:30 in Shanghai (UTC+8); in UTC it would be the 2nd.
  expect(new Date(Date.UTC(2026, 2, 2, 16, 30)).getDate()).toBe(3)
})

it('resolves the @/ alias', () => {
  expect(typeof cn('a', 'b')).toBe('string')
})
