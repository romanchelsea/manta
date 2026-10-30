// Kept out of the 'use client' theme module so the server layout can inline it.
export const THEME_KEY = 'd2web.theme';

// Runs before first paint so a dark-mode visitor never sees a white flash.
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}');var d=p==='dark'||(p!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(_){}})()`;
