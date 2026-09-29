import { useMutation } from "@tanstack/react-query";
import { curriculumPresetApi } from "@/features/curriculum/api/curriculumPreset";
import { curriculumKeys } from "@/features/curriculum/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useRunCurriculumPreset = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: curriculumPresetApi.run,
    onSuccess: () => {
      // The preset creates both curriculum records and catalogue subjects.
      // Invalidate the exact subject key as well as the curriculum tree so
      // both tabs render the newly-created data immediately.
      invalidate(curriculumKeys.all, curriculumKeys.subjects());
    },
  });
};
