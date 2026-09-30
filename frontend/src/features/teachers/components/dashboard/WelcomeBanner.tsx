import { Time } from "@carbon/icons-react";
import RoleBadge from "@/features/teachers/components/dashboard/RoleBadge";
import type { PositionRankLabel } from "@/features/positions/api/position";
import type { Teacher } from "@/features/teachers/api/teacher";
import { getInitials, displayName } from "@/shared/lib/name";

export default function WelcomeBanner({
  profile,
  subjectSummary,
  currentYearLabel,
  currentTermName,
  pendingCount,
  rankLabel,
}: {
  profile: Teacher;
  subjectSummary: string;
  currentYearLabel?: string;
  currentTermName?: string;
  pendingCount: number;
  rankLabel: PositionRankLabel;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="os-bg-layer os-border os-py-5 os-px-6 os-mb-6 os-flex os-items-center os-gap-4 os-wrap"
    >
      <div className="os-w-2t os-h-2t os-rounded-full os-bg-accent os-flex os-items-center os-justify-center os-c-layer os-fw-700 os-text-base os-shrink-0"
      >
        {getInitials(displayName(profile))}
      </div>
      <div className="os-flex-1">
        <div className="os-flex os-items-center os-gap-2 os-mb-h os-wrap">
          <p className="os-m-0 os-text-lg os-fw-500 os-c-primary">
            {greeting}, {profile.title ? `${profile.title} ` : ""}{displayName(profile)}
          </p>
          <RoleBadge rankLabel={rankLabel} />
        </div>
        <p className="os-m-0 os-text-sm os-c-secondary">
          {subjectSummary} · {profile.employee_number}
          {currentYearLabel ? ` · ${currentYearLabel}` : ""}
          {currentTermName ? ` ${currentTermName}` : ""}
        </p>
      </div>
      {pendingCount > 0 && (
        <div className="os-flex os-items-center os-gap-2 os-py-2 os-px-3h os-bg-status-late os-border-warning os-text-sm os-c-warning-text">
          <Time size={14} className="os-fill-warning" />
          {pendingCount} session{pendingCount > 1 ? "s" : ""} pending today
        </div>
      )}
    </div>
  );
}
