import { Routes, Route } from "react-router";
import SignIn from "./pages/SignIn";
import Setup from "./pages/Setup";
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
import Teachers from "./pages/admin/teachers/Teachers";
import AddTeacher from "./pages/admin/teachers/AddTeacher";
import TeacherDetail from "./pages/admin/teachers/TeacherDetail";
import Classes from "./pages/admin/classes/Classes";
import Streams from "./pages/admin/streams/Streams";
import Prefects from "./pages/admin/prefects/Prefects";
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
import Notifications from "./pages/admin/notifications/Notifications";
import SettingsPage from "./pages/admin/settings/Settings";
import SchoolSetup from "./pages/admin/setup/SchoolSetup";
import NotFound from "./pages/NotFound";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherProfile from "./pages/teacher/TeacherProfile";

// Parent pages
import ParentDashboard from "./pages/parent/ParentDashboard";
import ChildDetail from "./pages/parent/ChildDetail";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";

function App() {
  useApi();
  useProvisionUser();
  const { role, loading } = useRole();

  return (
    <Routes>
      {/* Public routes - always accessible */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/setup" element={<Setup />} />

      {/* Dev-only previews for status pages that are otherwise only reachable
          by actually triggering the condition (no role, unbuilt feature). */}
      {import.meta.env.DEV && (
        <>
          <Route path="/dev/access-restricted" element={<AccessRestricted />} />
          <Route path="/dev/coming-soon" element={<ComingSoon feature="Example Feature" />} />
        </>
      )}

      {/* Show loading state while role is being determined */}
      {loading ? (
        <Route
          path="*"
          element={
            <div style={{ minHeight: "100vh", background: "#f4f4f4" }} />
          }
        />
      ) : role === "teacher" ? (
        /* Teacher routes */
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
          <Route path="/t/profile" element={<TeacherProfile />} />
          <Route
            path="/attendance/sessions/:id/mark"
            element={<AttendanceMark />}
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      ) : role === "admin" ? (
        /* Admin routes */
        <>
          {/* Full-page wizard — deliberately outside RootLayout so it
              renders without the sidebar/header chrome. */}
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
          <Route path="/teachers" element={<Teachers />} />
          <Route path="/teachers/new" element={<AddTeacher />} />
          <Route path="/teachers/:id" element={<TeacherDetail />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/new" element={<AddClass />} />
          <Route path="/classes/:id" element={<ClassDetail />} />
          <Route path="/streams" element={<Streams />} />
          <Route path="/prefects" element={<Prefects />} />
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
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
          </Route>
        </>
      ) : role === "parent" ? (
        /* Parent routes */
        <Route
          element={
            <ProtectedRoute>
              <ParentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ParentDashboard />} />
          <Route path="/p/children/:id" element={<ChildDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      ) : role === "student" ? (
        /* Student routes */
        <Route
          element={
            <ProtectedRoute>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      ) : (
        /* unrecognized roles: no portal built yet — never fall through to
           admin, teacher, parent, or student routes */
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
