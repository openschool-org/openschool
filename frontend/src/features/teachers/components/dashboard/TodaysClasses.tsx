import { Card, Progress, Skeleton, Tag } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import type { MyClass } from "@/features/teachers/queries/useTeachers";
import type { AttendanceSession } from "@/features/attendance/api/attendance";
import StartSessionButton from "@/features/attendance/components/StartSessionButton";
import { formatLongDate } from "@/shared/lib/date";
import { classLabel } from "@/shared/lib/classLabel";
import LinkButton from "@/shared/ui/LinkButton";
import ErrorMessage from "@/shared/ui/ErrorMessage";

interface Props {
  myClasses: MyClass[];
  todaySessionByClass: Map<string, AttendanceSession>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

// Each of the teacher's classes with today's attendance state and the next step.
export default function TodaysClasses({ myClasses, todaySessionByClass, loading, error, onRetry }: Props) {
  const marked = todaySessionByClass.size;
  const total = myClasses.length;

  return (
    <Card className="os-dash-card is-flush" title="Today's attendance" extra={<span className="os-text-sm os-c-tertiary">{formatLongDate(new Date())}</span>}>
      {loading ? (
        <div className="os-dash-empty"><Skeleton title={false} paragraph={{ rows: 3 }} /></div>
      ) : error ? (
        <div className="os-dash-empty"><ErrorMessage message="Could not load today's attendance." onRetry={onRetry} /></div>
      ) : (
        <>
          <div className="os-dash-progress">
            <Progress percent={total ? Math.round((marked / total) * 100) : 0} showInfo={false} status={marked === total ? "success" : "active"} aria-label="Classes marked today" />
            <span className="os-text-sm os-fw-500 os-nowrap">{marked} of {total} marked</span>
          </div>
          {myClasses.map((cls) => {
            const session = todaySessionByClass.get(cls.class_id);
            return (
              <div key={cls.class_id} className="os-dash-item">
                <div className="os-dash-item__body">
                  <p className="os-dash-item__title">
                    {classLabel(cls.grade_name, cls.class_name)}
                    {cls.isFormTeacher && <Tag variant="filled">Class teacher</Tag>}
                  </p>
                  <p className="os-dash-item__sub">
                    {cls.subjects.length > 0 ? `${cls.subjects.join(", ")} · ` : ""}{cls.studentCount} students
                  </p>
                </div>
                {session ? <Tag color="success" variant="filled">Marked</Tag> : <Tag color="warning" variant="filled">Not marked</Tag>}
                {session ? (
                  <LinkButton to={`/attendance/sessions/${session.id}/mark`} icon={<ArrowRightOutlined />} iconPlacement="end">View</LinkButton>
                ) : (
                  <StartSessionButton classId={cls.class_id}>Mark now</StartSessionButton>
                )}
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
}
