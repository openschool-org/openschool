import { Link } from "react-router";
import { Card, Empty, Skeleton, Tag } from "antd";
import { formatShortDayMonth } from "@/shared/lib/date";

export type RecentActivityItem = {
  key: string;
  text: string;
  sub: string;
  time: string;
  path: string;
  kind: "student" | "teacher";
};

export default function RecentActivitySection({ items, loading }: { items: RecentActivityItem[]; loading: boolean }) {
  return (
    <Card className="os-dash-card is-flush" title="Recent activity" extra={<Link to="/students">View all</Link>}>
      {loading ? (
        <div className="os-dash-empty"><Skeleton title={false} paragraph={{ rows: 4 }} /></div>
      ) : items.length === 0 ? (
        <Empty
          className="os-dash-empty"
          description="Nothing here yet. Enrol students and add teachers to see recent activity."
        >
          <Link to="/students/new">Enrol a student</Link>
        </Empty>
      ) : (
        items.map((item) => (
          <Link key={item.key} to={item.path} className="os-dash-activity">
            <div className="os-dash-activity__body">
              <p className="os-dash-activity__text">{item.text}</p>
              {item.sub && <p className="os-dash-activity__sub">{item.sub}</p>}
            </div>
            <div className="os-dash-activity__side">
              <Tag variant="filled">{item.kind === "teacher" ? "Teacher" : "Student"}</Tag>
              <span>{formatShortDayMonth(item.time)}</span>
            </div>
          </Link>
        ))
      )}
    </Card>
  );
}
