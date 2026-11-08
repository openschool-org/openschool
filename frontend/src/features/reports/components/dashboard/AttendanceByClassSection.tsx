import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Card, Empty, Modal, Progress, Skeleton, Tag } from "antd";
import { RightOutlined } from "@ant-design/icons";
import type { ClassWithDetails } from "@/features/academics/api/class";
import type { DailySession } from "@/features/attendance/api/attendance";
import MediumTag from "@/shared/ui/MediumTag";

function ClassAttendanceBox({ cls, session }: { cls: ClassWithDetails; session: DailySession | undefined }) {
  const isMarked = !!session && session.marked_count > 0;
  const tag = !session ? <Tag variant="filled">No session</Tag> : isMarked ? <Tag color="success" variant="filled">Marked</Tag> : <Tag color="warning" variant="filled">Pending</Tag>;

  return (
    <Link to={`/classes/${cls.id}`} state={{ tab: "attendance" }} className="os-dash-class">
      <div className="os-dash-class__top">
        <span className="os-dash-class__name">{cls.name}{cls.medium_name && <> <MediumTag name={cls.medium_name} /></>}</span>
        {tag}
      </div>
      {session && (
        <>
          <div className="os-dash-class__row"><span>Marked today</span><strong>{session.marked_count} / {session.enrolled_count}</strong></div>
          <Progress
            size={{ height: 6 }}
            showInfo={false}
            percent={session.enrolled_count > 0 ? Math.round((session.marked_count / session.enrolled_count) * 100) : 0}
            strokeColor={isMarked ? "var(--os-success)" : "var(--os-warning)"}
            aria-label={`${cls.name} students marked`}
          />
        </>
      )}
    </Link>
  );
}

export default function AttendanceByClassSection({
  classes,
  loading,
  sessionByClassId,
}: {
  classes: ClassWithDetails[] | undefined;
  loading: boolean;
  sessionByClassId: Map<string, DailySession>;
}) {
  const [selectedGradeName, setSelectedGradeName] = useState<string | null>(null);
  const grades = useMemo(() => {
    const grouped = new Map<string, ClassWithDetails[]>();
    for (const cls of classes ?? []) grouped.set(cls.grade_name, [...(grouped.get(cls.grade_name) ?? []), cls]);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([name, gradeClasses]) => ({ name, classes: gradeClasses }));
  }, [classes]);
  const selectedGrade = grades.find((grade) => grade.name === selectedGradeName) ?? null;

  return (
    <Card className="os-dash-card is-flush" title="Attendance by grade" extra={<Link to="/attendance">Manage</Link>}>
      {loading ? (
        <div className="os-dash-empty"><Skeleton title={false} paragraph={{ rows: 5 }} /></div>
      ) : !classes || classes.length === 0 ? (
        <Empty className="os-dash-empty" description="No classes yet. Add a class to start taking attendance.">
          <Link to="/classes/new">Add a class</Link>
        </Empty>
      ) : (
        <ul className="os-dash-rows">
          {grades.map((grade) => {
            const marked = grade.classes.filter((cls) => sessionByClassId.get(cls.id)?.marked_count).length;
            const pending = grade.classes.filter((cls) => {
              const session = sessionByClassId.get(cls.id);
              return !!session && session.marked_count === 0;
            }).length;
            return (
              <li key={grade.name}>
                <button type="button" className="os-dash-row" onClick={() => setSelectedGradeName(grade.name)} aria-label={`View attendance for ${grade.name}`}>
                  <span className="os-dash-row__name">{grade.name}</span>
                  <span className="os-dash-row__muted">{grade.classes.length} class{grade.classes.length === 1 ? "" : "es"}</span>
                  <Progress size={{ height: 6 }} showInfo={false} percent={Math.round((marked / grade.classes.length) * 100)} aria-label={`${grade.name} classes marked`} />
                  <span className="os-dash-row__counts"><strong>{marked}</strong> marked · <strong>{pending}</strong> pending</span>
                  <RightOutlined className="os-dash-row__chev" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!selectedGrade}
        onCancel={() => setSelectedGradeName(null)}
        footer={null}
        width={760}
        title={selectedGrade ? `${selectedGrade.name} attendance` : "Grade attendance"}
      >
        <p className="os-mt-0 os-mb-4 os-text-sm os-c-secondary">Today’s attendance by class. Select a class to view or manage its attendance.</p>
        {selectedGrade && <div className="os-dash-classes">{selectedGrade.classes.map((cls) => <ClassAttendanceBox key={cls.id} cls={cls} session={sessionByClassId.get(cls.id)} />)}</div>}
      </Modal>
    </Card>
  );
}
