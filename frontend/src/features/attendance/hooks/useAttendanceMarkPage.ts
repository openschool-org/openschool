import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { isLockedAfter24Hours } from "@/shared/lib/date";
import { useSession, useSessionRecords, useMarkAttendance } from "@/features/attendance/queries/useAttendance";
import { useClass } from "@/features/academics/queries/useClasses";
import { useStudentsByClass } from "@/features/students/queries/useStudents";
import { useGrades } from "@/features/academics/queries/useGrades";
import { useRole } from "@/shared/auth/useRole";
import { useAttendanceMarking } from "@/features/attendance/hooks/useAttendanceMarking";
import { useUnsavedChangesGuard } from "@/shared/hooks/useUnsavedChangesGuard";
import { useToast } from "@/shared/ui/toast/useToast";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import type { Student } from "@/features/students/api/student";

export function matchesStudent(st: Student, query: string): boolean {
  const q = query.trim().toLowerCase();
  return st.full_name.toLowerCase().includes(q) || st.name_with_initials.toLowerCase().includes(q) || st.index_number.toLowerCase().includes(q);
}

// Everything the mark-attendance page needs: the session, its roster, lock rules, search and saving.
export function useAttendanceMarkPage(id: string) {
  const navigate = useNavigate();
  const { role } = useRole();
  const { showToast } = useToast();

  const session = useSession(id);
  const { data: records, isLoading: recordsLoading } = useSessionRecords(id);
  const { data: cls } = useClass(session.data?.class_id ?? "");
  usePageTitle(cls ? `Mark attendance ${cls.name}` : null);
  const { data: students, isLoading: studentsLoading } = useStudentsByClass(session.data?.class_id ?? "");
  const { data: grades } = useGrades();
  const markAttendance = useMarkAttendance(id);
  const marking = useAttendanceMarking(id, records, students);
  const unsavedGuard = useUnsavedChangesGuard(marking.hasUnsaved);

  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");

  // A session locks 24 hours after it is taken; only an admin can still edit it, with a reason.
  const locked = isLockedAfter24Hours(session.data?.created_at);
  const readOnly = locked && role !== "admin";
  const isOverride = locked && role === "admin";
  const backPath = role === "teacher" ? "/t/attendance" : "/attendance";

  const filtered = useMemo(() => (students ?? []).filter((s) => matchesStudent(s, search)), [students, search]);

  const save = () => {
    markAttendance.mutate(
      { ...marking.toRequest(), reason: isOverride ? reason.trim() || undefined : undefined },
      {
        onSuccess: () => {
          marking.clearDraft();
          marking.markSaved();
          showToast({ kind: "success", title: "Attendance saved" });
          navigate(backPath);
        },
      },
    );
  };

  return {
    session,
    cls,
    gradeName: grades?.find((g) => g.id === cls?.grade_id)?.name,
    students,
    rosterLoading: studentsLoading || recordsLoading,
    marking,
    markAttendance,
    readOnly,
    isOverride,
    search,
    setSearch,
    reason,
    setReason,
    filtered,
    leave: () => unsavedGuard.guard(() => navigate(backPath)),
    unsavedGuard,
    save,
  };
}

export type AttendanceMarkPage = ReturnType<typeof useAttendanceMarkPage>;
