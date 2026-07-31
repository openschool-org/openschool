import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enrollmentApi } from "../services/enrollment";
import type { SubmitEnrollmentRequest } from "../services/enrollment";

export const studentEnrollmentsKey = (
  studentId: string,
  academicYearId: string,
) => ["students", studentId, "enrollments", academicYearId];

export const useStudentEnrollments = (
  studentId: string,
  academicYearId: string,
) =>
  useQuery({
    queryKey: studentEnrollmentsKey(studentId, academicYearId),
    queryFn: () => enrollmentApi.listByStudent(studentId, academicYearId),
    enabled: !!studentId && !!academicYearId,
  });

export const useSubmitEnrollments = (
  studentId: string,
  academicYearId: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SubmitEnrollmentRequest) => {
      const check = await enrollmentApi.validate(data);
      if (!check.valid) return check;
      return enrollmentApi.submit(studentId, data);
    },
    onSuccess: (result) => {
      if (result.valid) {
        queryClient.invalidateQueries({
          queryKey: studentEnrollmentsKey(studentId, academicYearId),
        });
      }
    },
  });
};
