// Custom icons for rooms Carbon has no good match for, drawn on Carbon's 32 x 32 grid.
interface IconProps {
  size?: number;
}

function Svg({ size = 16, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

// Two beamed quavers.
export function MusicRoomIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="24" r="4" />
      <circle cx="24" cy="21" r="4" />
      <path d="M12 6h2v18h-2zM26 3h2v18h-2zM12 6l16-3v4l-16 3z" />
    </Svg>
  );
}

// A dancer with one arm raised and a flared skirt.
export function DanceRoomIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="16" cy="5" r="3" />
      <path d="M16 14l-6 9h12z" />
      <path d="M16 9v7M16 11l8-6M16 11l-7 4M14 23l-2 6M18 23l4 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

// A stage: valance, drawn curtains, a spotlight and the stage floor.
export function HallIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4h26v3H3z" />
      <path d="M4 7h5c0 7-1 13-3 19H4zM28 7h-5c0 7 1 13 3 19h2z" />
      <circle cx="16" cy="19" r="2.5" />
      <path d="M2 27h28v3H2z" />
    </Svg>
  );
}
