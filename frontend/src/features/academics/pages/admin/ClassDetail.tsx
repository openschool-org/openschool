import { Link, useParams, useLocation } from "react-router";
import { Button, Tag, Tabs, Tab, TabList, TabPanels, TabPanel } from "@carbon/react";
import { ArrowLeft, Edit, UserMultiple, EventSchedule, UserFollow } from "@carbon/icons-react";
import { useClassDetail } from "@/features/academics/hooks/useClassDetail";
import { useClassDetailModals } from "@/features/academics/components/ClassDetailModals";
import StudentsTab from "@/features/academics/components/StudentsTab";
import AttendanceTab from "@/features/academics/components/AttendanceTab";
import DetailsTab from "@/features/academics/components/DetailsTab";
import SubjectsTab from "@/features/academics/components/SubjectsTab";
import ClassMarks from "@/features/marks/components/ClassMarks";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import SectionHeader from "@/shared/ui/SectionHeader";
import InfoRow from "@/shared/ui/InfoRow";
import { usePageTitle } from "@/shared/hooks/usePageTitle";

// "10A" reads as "Grade 10-A" in the banner.
function formatClassLabel(name: string) {
  const m = name.match(/^(\d+)([^\d-].*)$/);
  return m ? `${m[1]}-${m[2]}` : name;
}

export default function ClassDetail() {
  const { id = "" } = useParams();
  const location = useLocation();
  const initialTab = (location.state as { tab?: string } | null)?.tab === "attendance" ? 1 : 0;
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

  const meta = [names.academicYear, formTeacher && `Form teacher: ${formTeacher.full_name}`].filter(Boolean).join(" · ");
  const students = detail.roster.data;
  const sessions = detail.sessions.data;

  return (
    <div className="os-bg-layer-hover os-min-h-content">
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{cls.name}</div>
        <div className="os-flex-1">
          <p className="os-profile__name">Grade {formatClassLabel(cls.name)}</p>
          <p className="os-profile__meta">{meta}</p>
        </div>
        <div className="os-profile__actions">
          {names.stream && <Tag type="blue" size="sm">{names.stream}</Tag>}
          {names.medium && <Tag type="purple" size="sm">{names.medium}</Tag>}
          {names.homeClassroom && <Tag type="teal" size="sm">{names.homeClassroom}</Tag>}
          <Button renderIcon={Edit} kind="ghost" size="sm" onClick={m.openEdit}>Edit</Button>
          <Button renderIcon={UserMultiple} kind="ghost" size="sm" onClick={m.openTeacher}>
            {formTeacher ? "Change teacher" : "Assign teacher"}
          </Button>
          <Button renderIcon={UserFollow} kind="ghost" size="sm" onClick={m.openMonitors}>
            {girlMonitor || boyMonitor ? "Change monitors" : "Assign monitors"}
          </Button>
          <Button renderIcon={ArrowLeft} kind="secondary" size="sm" as={Link} to="/classes">Back</Button>
        </div>
      </div>

      <div className="os-py-6 os-px-8">
        <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
          <div>
            <Tabs defaultSelectedIndex={initialTab}>
              <TabList aria-label="Class sections">
                <Tab>Students</Tab>
                <Tab>Attendance</Tab>
                <Tab>Marks</Tab>
                <Tab>Subjects & teachers</Tab>
                <Tab>Details</Tab>
              </TabList>
              <TabPanels>
                <TabPanel className="os-p-0">
                  <StudentsTab
                    cls={cls}
                    students={students}
                    studentsLoading={detail.roster.isLoading}
                    unenrollStudent={m.unenrollStudent}
                    onOpenEnrol={m.openEnrol}
                    onRequestUnenroll={m.setToUnenroll}
                  />
                </TabPanel>
                <TabPanel className="os-p-0">
                  <AttendanceTab
                    sessions={sessions}
                    sessionsLoading={detail.sessions.isLoading}
                    createSession={m.createSession}
                    deleteSession={m.deleteSession}
                    onOpenNewSession={m.openNewSession}
                    onRequestDeleteSession={m.setToDeleteSession}
                  />
                </TabPanel>
                <TabPanel className="os-p-0">
                  <div className="os-mt-4">
                    <ClassMarks classId={id} academicYearId={cls.academic_year_id} />
                  </div>
                </TabPanel>
                <TabPanel className="os-p-0">
                  <SubjectsTab classId={id} academicYearId={cls.academic_year_id} />
                </TabPanel>
                <TabPanel className="os-p-0">
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
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>

          <div>
            <div className="os-section">
              <SectionHeader title="Quick info" />
              <div className="os-section__body os-py-3 os-px-6">
                <InfoRow label="Grade" value={names.grade ?? "-"} />
                <InfoRow label="Stream" value={names.stream ?? "None"} />
                <InfoRow label="Medium" value={names.medium ?? "Not designated"} />
                <InfoRow label="Home classroom" value={names.homeClassroom ?? "Not assigned"} />
                <InfoRow label="Enrolled" value={students?.length ?? 0} />
                <InfoRow label="Academic year" value={names.academicYear ?? "-"} divider={false} />
              </div>
            </div>
            <div className="os-section">
              <SectionHeader title="Attendance summary" />
              <div className="os-section__body os-py-3 os-px-6">
                <InfoRow label="Total sessions" value={sessions?.length ?? 0} bold divider={false} />
                <div className="os-mt-2">
                  <Button kind="ghost" size="sm" onClick={m.openNewSession} className="os-c-accent os-p-0">
                    <EventSchedule size={14} className="os-mr-1h" />
                    New session →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {m.modals}
    </div>
  );
}
