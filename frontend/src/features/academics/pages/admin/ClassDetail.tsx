import { useParams, useLocation } from "react-router";
import { Button, Tabs, Tag } from "antd";
import { ArrowLeftOutlined, EditOutlined, ScheduleOutlined, TeamOutlined, UserAddOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import { useClassDetail } from "@/features/academics/hooks/useClassDetail";
import { useClassDetailModals } from "@/features/academics/components/ClassDetailModals";
import StudentsTab from "@/features/academics/components/StudentsTab";
import AttendanceTab from "@/features/academics/components/AttendanceTab";
import DetailsTab from "@/features/academics/components/DetailsTab";
import SubjectsTab from "@/features/academics/components/SubjectsTab";
import ClassMarks from "@/features/marks/components/ClassMarks";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import ProfileBanner from "@/shared/ui/ProfileBanner";
import SectionCard from "@/shared/ui/SectionCard";
import InfoRow from "@/shared/ui/InfoRow";
import MediumTag from "@/shared/ui/MediumTag";
import StreamTag from "@/shared/ui/StreamTag";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { displayName } from "@/shared/lib/name";
import GradeAvatar from "@/shared/ui/GradeAvatar";

// "10A" reads as "Grade 10-A" in the banner.
function formatClassLabel(name: string) {
  const m = name.match(/^(\d+)([^\d-].*)$/);
  return m ? `${m[1]}-${m[2]}` : name;
}

export default function ClassDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "attendance" ? "attendance" : "students";
  const detail = useClassDetail(id);
  const cls = detail.cls.data;
  usePageTitle(cls ? `Class ${cls.name}` : null);
  const m = useClassDetailModals(id, cls, detail);
  const { names, formTeacher, girlMonitor, boyMonitor } = detail;

  if (detail.cls.isLoading) return <LoadingSpinner />;
  if (detail.cls.isError || !cls) {
    return (
      <div className="os-p-8">
        <ErrorMessage message="Failed to load classroom details" onRetry={detail.cls.refetch} />
      </div>
    );
  }

  const meta = [names.academicYear, formTeacher && `Form teacher: ${displayName(formTeacher)}`].filter(Boolean).join(" · ");
  const students = detail.roster.data;
  const sessions = detail.sessions.data;

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <ProfileBanner
        name={`Grade ${formatClassLabel(cls.name)}`}
        avatar={<GradeAvatar gradeName={names.grade} className={cls.name} size="lg" />}
        meta={meta}
        actions={(
          <>
          {names.stream && <StreamTag name={names.stream} />}
          {names.medium && <MediumTag name={names.medium} />}
          {names.homeClassroom && <Tag color="cyan" variant="filled">{names.homeClassroom}</Tag>}
          <Button type="text" icon={<EditOutlined />} onClick={m.openEdit}>Edit</Button>
          <Button type="text" icon={<TeamOutlined />} onClick={m.openTeacher}>
            {formTeacher ? "Change teacher" : "Assign teacher"}
          </Button>
          <Button type="text" icon={<UserAddOutlined />} onClick={m.openMonitors}>
            {girlMonitor || boyMonitor ? "Change monitors" : "Assign monitors"}
          </Button>
          <LinkButton to="/classes" icon={<ArrowLeftOutlined />}>Back</LinkButton>
          </>
        )}
      />

      <div className="os-py-6 os-px-8">
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          <div>
            <Tabs
              className="os-detail-tabs"
              defaultActiveKey={initialTab}
              aria-label="Class sections"
              items={[
                {
                  key: "students",
                  label: "Students",
                  children: (
                    <StudentsTab
                      cls={cls}
                      students={students}
                      studentsLoading={detail.roster.isLoading}
                      unenrollStudent={m.unenrollStudent}
                      onOpenEnrol={m.openEnrol}
                      onRequestUnenroll={m.setToUnenroll}
                    />
                  ),
                },
                {
                  key: "attendance",
                  label: "Attendance",
                  children: (
                    <AttendanceTab
                      sessions={sessions}
                      sessionsLoading={detail.sessions.isLoading}
                      createSession={m.createSession}
                      deleteSession={m.deleteSession}
                      onOpenNewSession={m.openNewSession}
                      onRequestDeleteSession={m.setToDeleteSession}
                    />
                  ),
                },
                {
                  key: "marks",
                  label: "Marks",
                  children: <div className="os-mt-4"><ClassMarks classId={id} academicYearId={cls.academic_year_id} /></div>,
                },
                {
                  key: "subjects",
                  label: "Subjects & teachers",
                  children: <SubjectsTab classId={id} academicYearId={cls.academic_year_id} />,
                },
                {
                  key: "details",
                  label: "Details",
                  children: (
                    <DetailsTab
                      cls={cls}
                      gradeName={names.grade}
                      streamName={names.stream}
                      streamGroupName={names.streamGroup}
                      mediumName={names.medium}
                      homeClassroomName={names.homeClassroom}
                      academicYearLabel={names.academicYear}
                      girlMonitor={girlMonitor}
                      boyMonitor={boyMonitor}
                      formTeacher={formTeacher}
                    />
                  ),
                },
              ]}
            />
          </div>

          <div>
            <SectionCard title="Quick info" className="os-mb-4">
              <div className="os-py-3">
                <InfoRow label="Grade" value={names.grade ?? "-"} />
                <InfoRow label="Stream" value={names.stream ?? "None"} />
                <InfoRow label="Medium" value={names.medium ?? "Not designated"} />
                <InfoRow label="Home classroom" value={names.homeClassroom ?? "Not assigned"} />
                <InfoRow label="Enrolled" value={students?.length ?? 0} />
                <InfoRow label="Academic year" value={names.academicYear ?? "-"} divider={false} />
              </div>
            </SectionCard>
            <SectionCard title="Attendance summary">
              <div className="os-py-3">
                <InfoRow label="Total sessions" value={sessions?.length ?? 0} bold divider={false} />
                <div className="os-mt-2">
                  <Button type="link" size="small" icon={<ScheduleOutlined />} onClick={m.openNewSession} className="os-p-0">
                    New session
                  </Button>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      </div>

      {m.modals}
    </div>
  );
}
