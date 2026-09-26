import { Navigate, Route } from "react-router";
import { lazy as page } from "react";
import ProtectedRoute from "@/shared/auth/ProtectedRoute";
import { ADMIN_IDLE_TIMEOUT_MS } from "@/shared/auth/useIdleLogout";
import RootLayout from "@/layouts/RootLayout";

const NotFound = page(() => import("@/app/pages/NotFound"));
const Dashboard = page(() => import("@/features/reports/pages/admin/Dashboard"));
const Reports = page(() => import("@/features/reports/pages/admin/Reports"));
const Analytics = page(() => import("@/features/reports/pages/admin/Analytics"));
const Students = page(() => import("@/features/students/pages/admin/Students"));
const AddStudent = page(() => import("@/features/students/pages/admin/AddStudent"));
const StudentDetail = page(() => import("@/features/students/pages/admin/StudentDetail"));
const GuardiansDirectory = page(() => import("@/features/guardians/pages/admin/GuardiansDirectory"));
const NonAcademicStaff = page(() => import("@/features/staff/pages/admin/NonAcademicStaff"));
const Teachers = page(() => import("@/features/teachers/pages/admin/Teachers"));
const AddTeacher = page(() => import("@/features/teachers/pages/admin/AddTeacher"));
const TeacherDetail = page(() => import("@/features/teachers/pages/admin/TeacherDetail"));
const TeacherSubjects = page(() => import("@/features/teachers/pages/admin/TeacherSubjects"));
const Positions = page(() => import("@/features/positions/pages/admin/Positions"));
const Classes = page(() => import("@/features/academics/pages/admin/Classes"));
const AddClass = page(() => import("@/features/academics/pages/admin/AddClass"));
const ClassDetail = page(() => import("@/features/academics/pages/admin/ClassDetail"));
const Streams = page(() => import("@/features/academics/pages/admin/Streams"));
const Promotion = page(() => import("@/features/academics/pages/admin/Promotion"));
const SubjectsCurriculum = page(() => import("@/features/curriculum/pages/admin/SubjectsCurriculum"));
const AddSubject = page(() => import("@/features/curriculum/pages/admin/AddSubject"));
const LevelDetail = page(() => import("@/features/curriculum/pages/admin/LevelDetail"));
const Mediums = page(() => import("@/features/curriculum/pages/admin/Mediums"));
const Prefects = page(() => import("@/features/portfolio/pages/admin/Prefects"));
const Societies = page(() => import("@/features/portfolio/pages/admin/Societies"));
const Attendance = page(() => import("@/features/attendance/pages/admin/Attendance"));
const AttendanceMark = page(() => import("@/features/attendance/pages/admin/AttendanceMark"));
const StaffAttendance = page(() => import("@/features/attendance/pages/admin/StaffAttendance"));
const AcademicYears = page(() => import("@/features/school/pages/admin/AcademicYears"));
const SettingsPage = page(() => import("@/features/school/pages/admin/Settings"));
const SchoolSetup = page(() => import("@/features/school/pages/admin/SchoolSetup"));
const GradeSections = page(() => import("@/features/timetable/pages/admin/GradeSections"));
const YearEnd = page(() => import("@/features/workflows/pages/admin/YearEnd"));
const WorkflowPage = page(() => import("@/features/workflows/pages/admin/WorkflowPage"));
const TimetableHub = page(() => import("@/features/timetable/pages/admin/TimetableHub"));
const TimetableEditor = page(() => import("@/features/timetable/pages/admin/TimetableEditor"));
const NotificationComposer = page(() => import("@/features/notifications/pages/NotificationComposer"));
const NotificationCenter = page(() => import("@/features/notifications/pages/NotificationCenter"));

export function adminRoutes() {
  return [
    <Route key="school-setup" path="/school-setup" element={<ProtectedRoute idleTimeoutMs={ADMIN_IDLE_TIMEOUT_MS}><SchoolSetup /></ProtectedRoute>} />,
    <Route key="admin" element={<ProtectedRoute idleTimeoutMs={ADMIN_IDLE_TIMEOUT_MS}><RootLayout /></ProtectedRoute>}>
      <Route index element={<Dashboard />} />
      <Route path="/students" element={<Students />} />
      <Route path="/students/new" element={<AddStudent />} />
      <Route path="/students/:id" element={<StudentDetail />} />
      <Route path="/guardians" element={<GuardiansDirectory />} />
      <Route path="/non-academic-staff" element={<NonAcademicStaff />} />
      <Route path="/staff-attendance" element={<StaffAttendance />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/teachers" element={<Teachers />} />
      <Route path="/teachers/new" element={<AddTeacher />} />
      <Route path="/teachers/:id" element={<TeacherDetail />} />
      <Route path="/teacher-subjects" element={<TeacherSubjects />} />
      <Route path="/classes" element={<Classes />} />
      <Route path="/classes/new" element={<AddClass />} />
      <Route path="/classes/:id" element={<ClassDetail />} />
      <Route path="/streams" element={<Streams />} />
      <Route path="/prefects" element={<Prefects />} />
      <Route path="/societies" element={<Societies />} />
      <Route path="/positions" element={<Positions />} />
      <Route path="/subjects" element={<SubjectsCurriculum />} />
      <Route path="/subjects/new" element={<AddSubject />} />
      <Route path="/grades" element={<Navigate to="/classes" replace />} />
      <Route path="/curriculum" element={<Navigate to="/subjects" replace />} />
      <Route path="/curriculum/:id" element={<LevelDetail />} />
      <Route path="/mediums" element={<Mediums />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/attendance/sessions/:id/mark" element={<AttendanceMark />} />
      <Route path="/academic-years" element={<AcademicYears />} />
      <Route path="/promotion" element={<Promotion />} />
      <Route path="/year-end" element={<YearEnd />} />
      <Route path="/year-end/:key" element={<WorkflowPage />} />
      <Route path="/notifications" element={<NotificationComposer />} />
      <Route path="/notification-center" element={<NotificationCenter />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/automation" element={<Navigate to="/settings" replace />} />
      <Route path="/timetables" element={<TimetableHub tab="timetables" />} />
      <Route path="/timetables/generate" element={<TimetableHub tab="generate" />} />
      <Route path="/timetables/:id" element={<TimetableEditor />} />
      <Route path="/grade-sections" element={<GradeSections />} />
      <Route path="/classrooms" element={<TimetableHub tab="classrooms" />} />
      <Route path="/subject-requirements" element={<TimetableHub tab="requirements" />} />
      <Route path="/timetable-settings" element={<TimetableHub tab="settings" />} />
      <Route path="*" element={<NotFound />} />
    </Route>,
  ];
}
