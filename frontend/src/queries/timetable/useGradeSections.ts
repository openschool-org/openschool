import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { gradeSectionApi } from "../../services/timetable/gradeSection";
import type {
  CreateGradeSectionRequest,
  UpdateGradeSectionRequest,
  TimetablePeriod,
} from "../../services/timetable/gradeSection";

export const gradeSectionsKey = (academicYearId: string) => ["grade-sections", academicYearId];
export const gradeSectionPeriodsKey = (id: string) => ["grade-sections", id, "periods"];

export const useGradeSections = (academicYearId: string) =>
  useQuery({
    queryKey: gradeSectionsKey(academicYearId),
    queryFn: () => gradeSectionApi.listByYear(academicYearId),
    enabled: !!academicYearId,
  });

export const useCreateGradeSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGradeSectionRequest) => gradeSectionApi.create(data),
    onSuccess: (_r, variables) =>
      queryClient.invalidateQueries({ queryKey: gradeSectionsKey(variables.academic_year_id) }),
  });
};

export const useUpdateGradeSection = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGradeSectionRequest }) =>
      gradeSectionApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeSectionsKey(academicYearId) }),
  });
};

export const useDeleteGradeSection = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gradeSectionApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeSectionsKey(academicYearId) }),
  });
};

export const useAssignGradesToSection = (academicYearId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, gradeIds }: { id: string; gradeIds: string[] }) =>
      gradeSectionApi.assignGrades(id, gradeIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeSectionsKey(academicYearId) }),
  });
};

export const useGradeSectionPeriods = (id: string) =>
  useQuery({
    queryKey: gradeSectionPeriodsKey(id),
    queryFn: () => gradeSectionApi.getPeriods(id),
    enabled: !!id,
  });

export const useSaveGradeSectionPeriods = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (periods: Omit<TimetablePeriod, "id">[]) => gradeSectionApi.savePeriods(id, periods),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeSectionPeriodsKey(id) }),
  });
};

export const useRegenerateGradeSectionPeriods = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => gradeSectionApi.regeneratePeriods(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gradeSectionPeriodsKey(id) }),
  });
};
