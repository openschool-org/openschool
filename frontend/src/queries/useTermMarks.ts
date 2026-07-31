import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { termMarkApi } from "../services/termMark";
import type { BulkUpsertMarksRequest } from "../services/termMark";

export const classMarksKey = (classId: string, termId: string, subjectId: string) => [
  "class-marks",
  classId,
  termId,
  subjectId,
];

export const useClassMarks = (classId: string, termId: string, subjectId: string) =>
  useQuery({
    queryKey: classMarksKey(classId, termId, subjectId),
    queryFn: () => termMarkApi.listClassMarks(classId, termId, subjectId),
    enabled: !!classId && !!termId && !!subjectId,
  });

export const useStudentMarks = (studentId: string, termId: string) =>
  useQuery({
    queryKey: ["student-marks", studentId, termId],
    queryFn: () => termMarkApi.listStudentMarks(studentId, termId),
    enabled: !!studentId && !!termId,
  });

export const useSaveClassMarks = (classId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkUpsertMarksRequest) => termMarkApi.bulkUpsert(classId, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: classMarksKey(classId, variables.term_id, variables.subject_id),
      });
    },
  });
};
