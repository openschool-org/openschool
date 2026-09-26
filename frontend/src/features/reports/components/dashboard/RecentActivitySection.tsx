import { Link } from "react-router";
import { UserFollow } from "@carbon/icons-react";
import { Tag, SkeletonText } from "@carbon/react";
import EmptyState from "@/shared/ui/EmptyState";
import SectionHeader from "@/shared/ui/SectionHeader";
import { formatShortDayMonth } from "@/shared/lib/date";

export type RecentActivityItem = {
  key: string;
  text: string;
  sub: string;
  time: string;
  path: string;
  kind: "student" | "teacher";
};

export default function RecentActivitySection({
  items,
  loading,
}: {
  items: RecentActivityItem[];
  loading: boolean;
}) {
  return (
    <div className="os-section">
      <SectionHeader
        title="Recent activity"
        meta={
          <Link to="/students" className="os-text-xs os-no-underline os-c-accent">
            View all →
          </Link>
        }
      />
      {loading ? (
        <div className="os-py-5 os-px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="os-mb-3">
              <SkeletonText width="60%" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description="Enrol students and add teachers to see recent activity."
          action={
            <Link to="/students/new" className="os-text-sm os-fw-500 os-c-accent">
              Enrol a student →
            </Link>
          }
        />
      ) : (
        <div>
          {items.map((item) => (
            <Link
              key={item.key}
              to={item.path}
              className="os-list-row os-items-start os-no-underline"
            >
              <div className="os-mt-h os-shrink-0">
                <UserFollow size={16} className={item.kind === "teacher" ? "os-fill-purple" : "os-fill-accent"} />
              </div>
              <div className="os-flex-1 os-min-w-0">
                <p className="os-mt-0 os-mx-0 os-mb-h os-text-md os-fw-500 os-c-primary">
                  {item.text}
                </p>
                {item.sub && <p className="os-m-0 os-text-xs os-c-secondary">{item.sub}</p>}
              </div>
              <div className="os-flex os-col os-items-end os-gap-1 os-shrink-0">
                <Tag type={item.kind === "teacher" ? "purple" : "blue"} size="sm">
                  {item.kind === "teacher" ? "Teacher" : "Student"}
                </Tag>
                <span className="os-text-xs os-c-tertiary">
                  {formatShortDayMonth(item.time)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
