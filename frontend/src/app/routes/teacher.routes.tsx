import { Route } from "react-router";
import { lazy as page } from "react";
import ProtectedRoute from "@/shared/auth/ProtectedRoute";
import TeacherLayout from "@/layouts/TeacherLayout";

const NotFound = page(() => import("@/app/pages/NotFound"));
const TeacherDashboard = page(() => import("@/features/teachers/pages/self/TeacherDashboard"));
const TeacherClasses = page(() => import("@/features/teachers/pages/self/TeacherClasses"));
const TeacherProfile = page(() => import("@/features/teachers/pages/self/TeacherProfile"));
const TeacherAttendance = page(() => import("@/features/attendance/pages/teacher/TeacherAttendance"));
const TeacherMyAttendance = page(() => import("@/features/attendance/pages/teacher/TeacherMyAttendance"));
const AttendanceMark = page(() => import("@/features/attendance/pages/admin/AttendanceMark"));
const TeacherTimetable = page(() => import("@/features/timetable/pages/teacher/TeacherTimetable"));
const TimetableReview = page(() => import("@/features/timetable/pages/teacher/TimetableReview"));
const TeacherTimetables = page(() => import("@/features/timetable/pages/teacher/TeacherTimetables"));
const TimetableEditor = page(() => import("@/features/timetable/pages/admin/TimetableEditor"));
const MySociety = page(() => import("@/features/portfolio/pages/teacher/MySociety"));
const TeacherMarks = page(() => import("@/features/marks/pages/teacher/TeacherMarks"));
const TeacherAnalytics = page(() => import("@/features/reports/pages/teacher/TeacherAnalytics"));
const MyLeave = page(() => import("@/features/leave/pages/teacher/MyLeave"));
const LeaveRegister = page(() => import("@/features/leave/pages/admin/LeaveRegister"));
const NotificationComposer = page(() => import("@/features/notifications/pages/NotificationComposer"));
const NotificationCenter = page(() => import("@/features/notifications/pages/NotificationCenter"));

export function teacherRoutes() {
  return (
    <Route element={<ProtectedRoute><TeacherLayout /></ProtectedRoute>}>
      <Route index element={<TeacherDashboard />} />
      <Route path="/t/classes" element={<TeacherClasses />} />
      <Route path="/t/attendance" element={<TeacherAttendance />} />
      <Route path="/t/my-attendance" element={<TeacherMyAttendance />} />
      <Route path="/t/leave" element={<MyLeave />} />
      <Route path="/t/leave-approvals" element={<LeaveRegister />} />
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
      <Route path="/attendance/sessions/:id/mark" element={<AttendanceMark />} />
      <Route path="*" element={<NotFound />} />
    </Route>
  );
}
