import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subjectPeriodRequirementApi } from "../../services/timetable/subjectPeriodRequirement";
import type { UpsertSubjectPeriodRequirementRequest } from "../../services/timetable/subjectPeriodRequirement";

export const subjectPeriodRequirementsKey = (academicYearId: string, gradeId: string) => [
  "subject-period-requirements",
  academicYearId,
  gradeId,
];

export const useSubjectPeriodRequirements = (academicYearId: string, gradeId: string) =>
  useQuery({
    queryKey: subjectPeriodRequirementsKey(academicYearId, gradeId),
    queryFn: () => subjectPeriodRequirementApi.listByGrade(academicYearId, gradeId),
    enabled: !!academicYearId && !!gradeId,
  });

export const useUpsertSubjectPeriodRequirement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertSubjectPeriodRequirementRequest) => subjectPeriodRequirementApi.upsert(data),
    onSuccess: (_r, variables) =>
      queryClient.invalidateQueries({
        queryKey: subjectPeriodRequirementsKey(variables.academic_year_id, variables.grade_id),
      }),
  });
};

export const useDeleteSubjectPeriodRequirement = (academicYearId: string, gradeId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => subjectPeriodRequirementApi.remove(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: subjectPeriodRequirementsKey(academicYearId, gradeId) }),
  });
};
