import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { timetableSettingsApi } from "../../services/timetable/timetableSettings";
import type { TimetableSettings } from "../../services/timetable/timetableSettings";

export const timetableSettingsKey = (academicYearId: string) => ["timetable-settings", academicYearId];

export const useTimetableSettings = (academicYearId: string) =>
  useQuery({
    queryKey: timetableSettingsKey(academicYearId),
    queryFn: () => timetableSettingsApi.getByYear(academicYearId),
    enabled: !!academicYearId,
    retry: false,
  });

export const useUpsertTimetableSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TimetableSettings) => timetableSettingsApi.upsert(data),
    onSuccess: (_r, variables) =>
      queryClient.invalidateQueries({ queryKey: timetableSettingsKey(variables.academic_year_id) }),
  });
};
