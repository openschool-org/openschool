import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gradeApi } from "../services/grade";
import type { Grade, CreateGradeRequest } from "../services/grade";

export const GRADES_KEY = ["grades"];

export const useGrades = () =>
  useQuery({
    queryKey: GRADES_KEY,
    queryFn: gradeApi.list,
  });

export const useCreateGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateGradeRequest) => gradeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRADES_KEY });
    },
  });
};

export const useUpdateGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateGradeRequest }) =>
      gradeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRADES_KEY });
    },
  });
};

export const useDeleteGrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => gradeApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRADES_KEY });
    },
  });
};

export const useReorderGrades = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: Grade[]) => {
      const changed = ordered
        .map((g, index) => ({ g, index }))
        .filter(({ g, index }) => g.sort_order !== index);

      await Promise.all(
        changed.map(({ g, index }) =>
          gradeApi.update(g.id, { name: g.name, sort_order: index }),
        ),
      );
      return changed.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GRADES_KEY });
    },
  });
};
