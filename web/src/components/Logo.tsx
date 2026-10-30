import { useId } from 'react';

// Original drawing after the outline of Dota 2's Manta Style item: a crescent axe whose
// afterimages stand for one player's several accounts. Keep in sync with src/app/icon.svg.
const BLADE =
  'M38.13 13.19A21 21 0 0 0 6.2 28.08L12 31L6.2 33.92A21 21 0 0 0 39.93 47.55L40.16 39.21A11 11 0 1 1 39.12 19.3Z';
const ENGRAVE = 'M31.27 15.06A16.5 16.5 0 0 0 11.5 25.36M11.5 36.64A16.5 16.5 0 0 0 32.64 46.5';

function Haft() {
  return <rect x="20" y="17.4" width="52" height="5.2" rx="2.6" transform="rotate(45 20 20)" />;
}
function Bands() {
  return (
    <>
      <rect x="40.01" y="37.61" width="2.4" height="7.2" rx="1" transform="rotate(45 41.21 41.21)" />
      <rect x="48.5" y="46.1" width="2.4" height="7.2" rx="1" transform="rotate(45 49.7 49.7)" />
    </>
  );
}
function Pommel() {
  return <rect x="55.58" y="55.58" width="5.2" height="5.2" rx="0.8" transform="rotate(45 58.18 58.18)" />;
}
function Afterimages({ blade, haft, opacity }: { blade: string; haft: string; opacity: [number, number] }) {
  return (
    <>
      <g transform="translate(8 -5)" opacity={opacity[0]}><path d={BLADE} fill={blade} /><g fill={haft}><Haft /></g></g>
      <g transform="translate(4 -2.5)" opacity={opacity[1]}><path d={BLADE} fill={blade} /><g fill={haft}><Haft /></g></g>
    </>
  );
}

const useSvgId = () => useId().replace(/[^a-zA-Z0-9]/g, '');

/** White axe on the brand gradient square: header and favicon. */
export function MantaMark({ className }: { className?: string }) {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}bg)`} />
      <g transform="translate(32 32) scale(.74) translate(-34 -31)">
        <Afterimages blade="#fff" haft="#fff" opacity={[0.2, 0.38]} />
        <g fill="#fff"><Haft /><path d={BLADE} /><Pommel /></g>
        <g fill="#db2777"><Bands /></g>
      </g>
    </svg>
  );
}

/** Gradient axe on a transparent background: large placements. */
export function MantaAxe({ className }: { className?: string }) {
  const id = useSvgId();
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id={`${id}blade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${id}haft`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <Afterimages blade={`url(#${id}blade)`} haft={`url(#${id}haft)`} opacity={[0.16, 0.32]} />
      <g fill={`url(#${id}haft)`}><Haft /></g>
      <g fill="#fbcfe8"><Bands /></g>
      <g fill="#f472b6"><Pommel /></g>
      <path d={BLADE} fill={`url(#${id}blade)`} />
      <path d={ENGRAVE} fill="none" stroke="#fff" strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
