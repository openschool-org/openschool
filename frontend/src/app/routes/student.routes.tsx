import { Route } from "react-router";
import { lazy as page } from "react";
import ProtectedRoute from "@/shared/auth/ProtectedRoute";
import StudentLayout from "@/layouts/StudentLayout";

const NotFound = page(() => import("@/app/pages/NotFound"));
const StudentDashboard = page(() => import("@/features/students/pages/self/StudentDashboard"));
const StudentEnrollment = page(() => import("@/features/students/pages/self/StudentEnrollment"));
const StudentAttendance = page(() => import("@/features/attendance/pages/student/StudentAttendance"));
const StudentMarks = page(() => import("@/features/marks/pages/student/StudentMarks"));
const StudentTimetable = page(() => import("@/features/timetable/pages/student/StudentTimetable"));
const StudentGuardians = page(() => import("@/features/guardians/pages/student/StudentGuardians"));
const StudentProgress = page(() => import("@/features/portfolio/pages/student/StudentProgress"));
const StudentPortfolio = page(() => import("@/features/portfolio/pages/student/StudentPortfolio"));
const StudentProfile = page(() => import("@/features/students/pages/self/StudentProfile"));
const NotificationCenter = page(() => import("@/features/notifications/pages/NotificationCenter"));

export function studentRoutes() {
  return (
    <Route element={<ProtectedRoute><StudentLayout /></ProtectedRoute>}>
      <Route index element={<StudentDashboard />} />
      <Route path="/s/attendance" element={<StudentAttendance />} />
      <Route path="/s/marks" element={<StudentMarks />} />
      <Route path="/s/timetable" element={<StudentTimetable />} />
      <Route path="/s/guardians" element={<StudentGuardians />} />
      <Route path="/s/progress" element={<StudentProgress />} />
      <Route path="/s/portfolio" element={<StudentPortfolio />} />
      <Route path="/s/enrollment" element={<StudentEnrollment />} />
      <Route path="/s/profile" element={<StudentProfile />} />
      <Route path="/notification-center" element={<NotificationCenter />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  );
}
