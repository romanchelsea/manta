'use client';
import { useSyncExternalStore } from 'react';
import { THEME_KEY } from '@/lib/theme-script';

export type ThemePref = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

let pref: ThemePref | null = null;
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

const getPref = (): ThemePref => (pref ??= readPref());

function darkQuery(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
}

function apply(): void {
  const p = getPref();
  const dark = p === 'dark' || (p === 'system' && !!darkQuery()?.matches);
  const el = document.documentElement;
  el.classList.toggle('dark', dark);
  el.style.colorScheme = dark ? 'dark' : 'light';
}

const emit = () => listeners.forEach((l) => l());

function onSystemChange(): void {
  if (getPref() !== 'system') return;
  apply();
  emit();
}

function subscribe(fn: () => void): () => void {
  if (!listeners.size) darkQuery()?.addEventListener('change', onSystemChange);
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (!listeners.size) darkQuery()?.removeEventListener('change', onSystemChange);
  };
}

export function setThemePref(next: ThemePref): void {
  pref = next;
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage unavailable */
  }
  apply();
  emit();
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, getPref, () => 'system');
}

/** The theme actually shown, as set on <html> by the inline script or setThemePref. */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'light',
  );
}
