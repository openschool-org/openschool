import { Routes, Route } from "react-router";
import SignIn from "./pages/SignIn";
import Setup from "./pages/Setup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PasswordInterstitial from "./pages/PasswordInterstitial";
import AccessRestricted from "./pages/AccessRestricted";
import ComingSoon from "./pages/ComingSoon";
import { useRole } from "./hooks/useRole";
import { useApi } from "./hooks/useApi";
import { useProvisionUser } from "./hooks/useProvisionUser";
import RootLayout from "./layouts/RootLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import ParentLayout from "./layouts/ParentLayout";
import StudentLayout from "./layouts/StudentLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin pages
import Dashboard from "./pages/admin/dashboard/Dashboard";
import Students from "./pages/admin/students/Students";
import AddStudent from "./pages/admin/students/AddStudent";
import StudentDetail from "./pages/admin/students/StudentDetail";
import GuardiansDirectory from "./pages/admin/guardians/GuardiansDirectory";
import NonAcademicStaff from "./pages/admin/staff/NonAcademicStaff";
import StaffAttendance from "./pages/admin/staff/StaffAttendance";
import Reports from "./pages/admin/reports/Reports";
import Teachers from "./pages/admin/teachers/Teachers";
import AddTeacher from "./pages/admin/teachers/AddTeacher";
import TeacherDetail from "./pages/admin/teachers/TeacherDetail";
import Classes from "./pages/admin/classes/Classes";
import Streams from "./pages/admin/streams/Streams";
import Prefects from "./pages/admin/prefects/Prefects";
import Positions from "./pages/admin/positions/Positions";
import AddClass from "./pages/admin/classes/AddClass";
import Subjects from "./pages/admin/subjects/Subjects";
import AddSubject from "./pages/admin/subjects/AddSubject";
import Grades from "./pages/admin/grades/Grades";
import Curriculum from "./pages/admin/curriculum/Curriculum";
import LevelDetail from "./pages/admin/curriculum/LevelDetail";
import Mediums from "./pages/admin/curriculum/Mediums";
import ClassDetail from "./pages/admin/classes/ClassDetail";
import Attendance from "./pages/admin/attendance/Attendance";
import AttendanceMark from "./pages/admin/attendance/AttendanceMark";
import AcademicYears from "./pages/admin/academic-years/AcademicYears";
import Promotion from "./pages/admin/promotion/Promotion";
import SettingsPage from "./pages/admin/settings/Settings";
import SchoolSetup from "./pages/admin/setup/SchoolSetup";
import NotFound from "./pages/NotFound";
import Classrooms from "./pages/admin/timetable/Classrooms";
import GradeSections from "./pages/admin/timetable/GradeSections";
import TimetableSettings from "./pages/admin/timetable/TimetableSettings";
import SubjectRequirements from "./pages/admin/timetable/SubjectRequirements";
import Timetables from "./pages/admin/timetable/Timetables";
import TimetableEditor from "./pages/admin/timetable/TimetableEditor";

// Teacher pages
import TeacherDashboard from "./pages/teacher/dashboard/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import TimetableReview from "./pages/teacher/TimetableReview";

// Parent pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ChildDetail from "./pages/parent/ChildDetail";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";

// Shared notifications pages (all portals)
import NotificationComposer from "./pages/notifications/NotificationComposer";
import NotificationCenter from "./pages/notifications/NotificationCenter";

function App() {
  useApi();
  const { data: me, isLoading: meLoading } = useProvisionUser();
  const { role, loading } = useRole();

  // Unconditional — gating meLoading behind `role !== null` created an
  // implicit coupling where a user whose role resolves after (or alongside)
  // a slow /me call could flash AccessRestricted despite having a valid
  // role, since meLoading was only consulted once role was already known.
  const stillLoading = loading || meLoading;

  return (
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
          <Route path="/timetables/:id" element={<TimetableEditor />} />
          <Route path="/t/notifications" element={<NotificationComposer />} />
          <Route path="/notification-center" element={<NotificationCenter />} />
          <Route path="/t/profile" element={<TeacherProfile />} />
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
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/teachers/new" element={<AddTeacher />} />
            <Route path="/teachers/:id" element={<TeacherDetail />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/classes/new" element={<AddClass />} />
            <Route path="/classes/:id" element={<ClassDetail />} />
            <Route path="/streams" element={<Streams />} />
            <Route path="/prefects" element={<Prefects />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/subjects/new" element={<AddSubject />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/curriculum" element={<Curriculum />} />
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
            <Route path="/timetables" element={<Timetables />} />
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
  );
}

export default App;
