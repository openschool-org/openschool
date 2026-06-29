import { Routes, Route } from "react-router";
import { useRole } from "./hooks/useRole";
import RootLayout from "./layouts/RootLayout";
import TeacherLayout from "./layouts/TeacherLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Admin pages
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import AddStudent from "./pages/AddStudent";
import StudentDetail from "./pages/StudentDetail";
import Teachers from "./pages/Teachers";
import AddTeacher from "./pages/AddTeacher";
import TeacherDetail from "./pages/TeacherDetail";
import Classes from "./pages/Classes";
import AddClass from "./pages/AddClass";
import Subjects from "./pages/Subjects";
import AddSubject from "./pages/AddSubject";
import ClassDetail from "./pages/ClassDetail";
import Attendance from "./pages/Attendance";
import AttendanceMark from "./pages/AttendanceMark";
import AcademicYears from "./pages/AcademicYears";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherProfile from "./pages/teacher/TeacherProfile";

function AdminApp() {
  return (
    <Routes>
      <Route element={<ProtectedRoute><RootLayout /></ProtectedRoute>}>
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

        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/new" element={<AddSubject />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/attendance/sessions/:id/mark" element={<AttendanceMark />} />
        <Route path="/academic-years" element={<AcademicYears />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function TeacherApp() {
  return (
    <Routes>
      <Route element={<ProtectedRoute><TeacherLayout /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="/t/classes" element={<TeacherClasses />} />
        <Route path="/t/attendance" element={<TeacherAttendance />} />
        <Route path="/t/profile" element={<TeacherProfile />} />
        {/* Teachers can still reach the shared attendance-mark page */}
        <Route path="/attendance/sessions/:id/mark" element={<AttendanceMark />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function App() {
  const { role, loading } = useRole();

  if (loading) return <div style={{ minHeight: "100vh", background: "#f4f4f4" }} />;

  return role === "teacher" ? <TeacherApp /> : <AdminApp />;
}

export default App;
