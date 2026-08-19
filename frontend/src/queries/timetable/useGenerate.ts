import { useMutation, useQueryClient } from "@tanstack/react-query";
import { generateApi } from "../../services/timetable/generate";
import type { GenerateTimetablesRequest } from "../../services/timetable/generate";

export const useGenerateTimetables = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateTimetablesRequest) => generateApi.generate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["timetables"] }),
  });
};
