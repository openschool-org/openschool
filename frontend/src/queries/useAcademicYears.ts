import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { academicYearApi } from "../services/academicYear";
import type { CreateAcademicYearRequest } from "../services/academicYear";

export const ACADEMIC_YEARS_KEY = ["academic-years"];
export const CURRENT_ACADEMIC_YEAR_KEY = ["academic-years", "current"];

export const useAcademicYears = () =>
  useQuery({
    queryKey: ACADEMIC_YEARS_KEY,
    queryFn: academicYearApi.list,
  });

export const useCurrentAcademicYear = () =>
  useQuery({
    queryKey: CURRENT_ACADEMIC_YEAR_KEY,
    queryFn: academicYearApi.getCurrent,
  });

export const useCreateAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAcademicYearRequest) =>
      academicYearApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACADEMIC_YEARS_KEY });
      queryClient.invalidateQueries({ queryKey: CURRENT_ACADEMIC_YEAR_KEY });
    },
  });
};

export const useSetCurrentAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicYearApi.setCurrent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACADEMIC_YEARS_KEY });
      queryClient.invalidateQueries({ queryKey: CURRENT_ACADEMIC_YEAR_KEY });
    },
  });
};

export const useDeleteAcademicYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => academicYearApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACADEMIC_YEARS_KEY });
    },
  });
};
