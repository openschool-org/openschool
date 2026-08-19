// This file defines the App component, which configures the main routing hierarchy, authentication guard routing, and lazy-loaded portal pages for each user role (admin, teacher, parent, student).

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router";
import { useRole } from "./hooks/useRole";
import { useApi } from "./hooks/useApi";
import { useProvisionUser } from "./hooks/useProvisionUser";
import RootLayout from "./layouts/RootLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import ParentLayout from "./layouts/ParentLayout";
import StudentLayout from "./layouts/StudentLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const SignIn = lazy(() => import("./pages/SignIn"));
const Setup = lazy(() => import("./pages/Setup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PasswordInterstitial = lazy(() => import("./pages/PasswordInterstitial"));
const AccessRestricted = lazy(() => import("./pages/AccessRestricted"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Dashboard = lazy(() => import("./pages/admin/dashboard/Dashboard"));
const Students = lazy(() => import("./pages/admin/students/Students"));
const AddStudent = lazy(() => import("./pages/admin/students/AddStudent"));
const StudentDetail = lazy(() => import("./pages/admin/students/StudentDetail"));
const GuardiansDirectory = lazy(() => import("./pages/admin/guardians/GuardiansDirectory"));
const NonAcademicStaff = lazy(() => import("./pages/admin/staff/NonAcademicStaff"));
const StaffAttendance = lazy(() => import("./pages/admin/staff/StaffAttendance"));
const Reports = lazy(() => import("./pages/admin/reports/Reports"));
const Analytics = lazy(() => import("./pages/admin/analytics/Analytics"));
const Teachers = lazy(() => import("./pages/admin/teachers/Teachers"));
const AddTeacher = lazy(() => import("./pages/admin/teachers/AddTeacher"));
const TeacherDetail = lazy(() => import("./pages/admin/teachers/TeacherDetail"));
const TeacherSubjects = lazy(() => import("./pages/admin/teachers/TeacherSubjects"));

const Classes = lazy(() => import("./pages/admin/classes/Classes"));
const Streams = lazy(() => import("./pages/admin/streams/Streams"));
const Prefects = lazy(() => import("./pages/admin/prefects/Prefects"));
const Societies = lazy(() => import("./pages/admin/societies/Societies"));
const Positions = lazy(() => import("./pages/admin/positions/Positions"));
const AddClass = lazy(() => import("./pages/admin/classes/AddClass"));
const SubjectsCurriculum = lazy(() => import("./pages/admin/subjects/SubjectsCurriculum"));
const AddSubject = lazy(() => import("./pages/admin/subjects/AddSubject"));
const LevelDetail = lazy(() => import("./pages/admin/curriculum/LevelDetail"));
const Mediums = lazy(() => import("./pages/admin/curriculum/Mediums"));
const ClassDetail = lazy(() => import("./pages/admin/classes/ClassDetail"));
const Attendance = lazy(() => import("./pages/admin/attendance/Attendance"));
const AttendanceMark = lazy(() => import("./pages/admin/attendance/AttendanceMark"));
const AcademicYears = lazy(() => import("./pages/admin/academic-years/AcademicYears"));
const Promotion = lazy(() => import("./pages/admin/promotion/Promotion"));
const SettingsPage = lazy(() => import("./pages/admin/settings/Settings"));
const Automation = lazy(() => import("./pages/admin/automation/Automation"));
const SchoolSetup = lazy(() => import("./pages/admin/setup/SchoolSetup"));
const Classrooms = lazy(() => import("./pages/admin/timetable/Classrooms"));
const GradeSections = lazy(() => import("./pages/admin/timetable/GradeSections"));
const TimetableSettings = lazy(() => import("./pages/admin/timetable/TimetableSettings"));
const SubjectRequirements = lazy(() => import("./pages/admin/timetable/SubjectRequirements"));
const Timetables = lazy(() => import("./pages/admin/timetable/Timetables"));
const TimetableEditor = lazy(() => import("./pages/admin/timetable/TimetableEditor"));
const GenerateTimetable = lazy(() => import("./pages/admin/timetable/GenerateTimetable"));

const TeacherDashboard = lazy(() => import("./pages/teacher/dashboard/TeacherDashboard"));
const TeacherClasses = lazy(() => import("./pages/teacher/TeacherClasses"));
const TeacherAttendance = lazy(() => import("./pages/teacher/TeacherAttendance"));
const TeacherProfile = lazy(() => import("./pages/teacher/TeacherProfile"));
const TeacherTimetable = lazy(() => import("./pages/teacher/TeacherTimetable"));
const TimetableReview = lazy(() => import("./pages/teacher/TimetableReview"));
const MySociety = lazy(() => import("./pages/teacher/MySociety"));
const TeacherMarks = lazy(() => import("./pages/teacher/TeacherMarks"));
const TeacherAnalytics = lazy(() => import("./pages/teacher/TeacherAnalytics"));
const TeacherTimetables = lazy(() => import("./pages/teacher/TeacherTimetables"));

const ParentDashboard = lazy(() => import("./pages/parent/ParentDashboard"));
const ChildDetail = lazy(() => import("./pages/parent/ChildDetail"));

const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentAttendance = lazy(() => import("./pages/student/StudentAttendance"));
const StudentMarks = lazy(() => import("./pages/student/StudentMarks"));
const StudentTimetable = lazy(() => import("./pages/student/StudentTimetable"));
const StudentGuardians = lazy(() => import("./pages/student/StudentGuardians"));
const StudentProgress = lazy(() => import("./pages/student/StudentProgress"));
const StudentPortfolio = lazy(() => import("./pages/student/StudentPortfolio"));
const StudentEnrollment = lazy(() => import("./pages/student/StudentEnrollment"));

const NotificationComposer = lazy(() => import("./pages/notifications/NotificationComposer"));
const NotificationCenter = lazy(() => import("./pages/notifications/NotificationCenter"));

function App() {
  useApi();
  const { data: me, isLoading: meLoading } = useProvisionUser();
  const { role, loading } = useRole();

  const stillLoading = loading || meLoading;

  return (
    <Suspense fallback={<div className="os-loading-placeholder" />} >
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {import.meta.env.DEV && (
          <>
            <Route path="/dev/access-restricted" element={<AccessRestricted />} />
            <Route
              path="/dev/coming-soon"
              element={<ComingSoon feature="Example Feature" />}
            />
          </>
        )}

        {stillLoading ? (
          <Route
            path="*"
            element={<div className="os-loading-placeholder" />}
          />
        ) : me?.must_change_password ? (
          <Route
            element={
              <ProtectedRoute>
                <PasswordInterstitial />
              </ProtectedRoute>
            }
          >
            <Route path="*" element={<PasswordInterstitial />} />
          </Route>
        ) : role === "teacher" ? (
          <Route
            element={
              <ProtectedRoute>
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="/t/classes" element={<TeacherClasses />} />
            <Route path="/t/attendance" element={<TeacherAttendance />} />
            <Route path="/t/timetable" element={<TeacherTimetable />} />
            <Route path="/t/timetable/review" element={<TimetableReview />} />
            <Route path="/t/my-society" element={<MySociety />} />
            <Route path="/timetables/:id" element={<TimetableEditor />} />
            <Route path="/t/notifications" element={<NotificationComposer />} />
            <Route path="/notification-center" element={<NotificationCenter />} />
            <Route path="/t/profile" element={<TeacherProfile />} />
            <Route path="/t/marks" element={<TeacherMarks />} />
            <Route path="/t/analytics" element={<TeacherAnalytics />} />
            <Route path="/t/all-timetables" element={<TeacherTimetables />} />
            <Route
              path="/attendance/sessions/:id/mark"
              element={<AttendanceMark />}
            />
            <Route path="*" element={<NotFound />} />
          </Route>
        ) : role === "admin" ? (
          <>
            <Route
              path="/school-setup"
              element={
                <ProtectedRoute>
                  <SchoolSetup />
                </ProtectedRoute>
              }
            />
            <Route
              element={
                <ProtectedRoute>
                  <RootLayout />
                </ProtectedRoute>
              }
            >
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
              <Route path="/curriculum" element={<SubjectsCurriculum />} />
              <Route path="/curriculum/:id" element={<LevelDetail />} />
              <Route path="/mediums" element={<Mediums />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route
                path="/attendance/sessions/:id/mark"
                element={<AttendanceMark />}
              />
              <Route path="/academic-years" element={<AcademicYears />} />
              <Route path="/promotion" element={<Promotion />} />
              <Route path="/notifications" element={<NotificationComposer />} />
              <Route
                path="/notification-center"
                element={<NotificationCenter />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/automation" element={<Automation />} />
              <Route path="/timetables" element={<Timetables />} />
              <Route path="/timetables/generate" element={<GenerateTimetable />} />
              <Route path="/timetables/:id" element={<TimetableEditor />} />
              <Route path="/grade-sections" element={<GradeSections />} />
              <Route path="/classrooms" element={<Classrooms />} />
              <Route
                path="/subject-requirements"
                element={<SubjectRequirements />}
              />
              <Route path="/timetable-settings" element={<TimetableSettings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </>
        ) : role === "parent" ? (
          <Route
            element={
              <ProtectedRoute>
                <ParentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ParentDashboard />} />
            <Route path="/p/children/:id" element={<ChildDetail />} />
            <Route path="/notification-center" element={<NotificationCenter />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        ) : role === "student" ? (
          <Route
            element={
              <ProtectedRoute>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="/s/attendance" element={<StudentAttendance />} />
            <Route path="/s/marks" element={<StudentMarks />} />
            <Route path="/s/timetable" element={<StudentTimetable />} />
            <Route path="/s/guardians" element={<StudentGuardians />} />
            <Route path="/s/progress" element={<StudentProgress />} />
            <Route path="/s/portfolio" element={<StudentPortfolio />} />
            <Route path="/s/enrollment" element={<StudentEnrollment />} />
            <Route path="/notification-center" element={<NotificationCenter />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        ) : (
          <Route
            element={
              <ProtectedRoute>
                <AccessRestricted />
              </ProtectedRoute>
            }
          >
            <Route path="*" element={<AccessRestricted />} />
          </Route>
        )}
      </Routes>
    </Suspense>
  );
}

export default App;
