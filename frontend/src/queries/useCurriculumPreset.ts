import { useMutation, useQueryClient } from "@tanstack/react-query";
import { curriculumPresetApi } from "../services/curriculumPreset";
import { LEVELS_KEY } from "./useCurriculum";

export const useRunCurriculumPreset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: curriculumPresetApi.run,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEVELS_KEY });
    },
  });
};
