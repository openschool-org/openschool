import { useQuery } from "@tanstack/react-query";
import { studentSelfApi } from "../services/studentSelf";

export const useMyStudentProfile = () =>
  useQuery({
    queryKey: ["my-student-profile"],
    queryFn: studentSelfApi.profile,
  });

export const useMyAttendance = () =>
  useQuery({
    queryKey: ["my-attendance"],
    queryFn: studentSelfApi.attendance,
  });

export const useMyMarks = (termId: string) =>
  useQuery({
    queryKey: ["my-marks", termId],
    queryFn: () => studentSelfApi.marks(termId),
    enabled: !!termId,
  });
