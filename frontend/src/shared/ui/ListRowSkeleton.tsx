import { SkeletonText } from "@/shared/ui/Skeleton";

interface Props {
  leadingWidth?: string | null;
  titleWidth?: string;
  subtitleWidth?: string | null;
  trailingWidth?: string | null;
  compact?: boolean;
}

// Placeholder for one `.os-list-row` while its list is loading. Pass `null` for any
// segment a given row doesn't have (e.g. no subtitle line, no trailing action).
export default function ListRowSkeleton({
  leadingWidth = "1.25rem",
  titleWidth = "30%",
  subtitleWidth = "15%",
  trailingWidth = "4rem",
  compact = false,
}: Props) {
  return (
    <div className={compact ? "os-list-row os-list-row--compact" : "os-list-row"}>
      {leadingWidth && <SkeletonText width={leadingWidth} />}
      <div className="os-flex-1">
        <div style={subtitleWidth ? { marginBottom: "0.4rem" } : undefined}>
          <SkeletonText width={titleWidth} />
        </div>
        {subtitleWidth && <SkeletonText width={subtitleWidth} />}
      </div>
      {trailingWidth && <SkeletonText width={trailingWidth} />}
    </div>
  );
}
