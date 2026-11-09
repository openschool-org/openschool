interface TextProps {
  width?: string;
  heading?: boolean;
  paragraph?: boolean;
  lineCount?: number;
  className?: string;
}

// Loading placeholder line(s); width is a runtime value so it stays inline.
export function SkeletonText({ width = "100%", heading, paragraph, lineCount = 3, className }: TextProps) {
  const cls = `os-skel os-skel-text${heading ? " os-skel-text--heading" : ""}${className ? ` ${className}` : ""}`;
  if (!paragraph) return <span className={cls} style={{ width }} aria-hidden />;
  return (
    <span className="os-skel-paragraph" aria-hidden>
      {Array.from({ length: lineCount }, (_, i) => (
        <span key={i} className={cls} style={{ width: i === lineCount - 1 ? "60%" : width }} />
      ))}
    </span>
  );
}

// Loading placeholder block; size it with a class, or style for runtime sizes.
export function SkeletonPlaceholder({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`os-skel os-skel-block${className ? ` ${className}` : ""}`} style={style} aria-hidden />;
}
