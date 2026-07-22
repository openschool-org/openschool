import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { houseApi } from "../services/house";
import type { CreateHouseRequest } from "../services/house";
import { STUDENTS_KEY } from "./useStudents";

export const HOUSES_KEY = ["houses"];

export const useHouses = () =>
  useQuery({
    queryKey: HOUSES_KEY,
    queryFn: houseApi.list,
  });

export const useCreateHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHouseRequest) => houseApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSES_KEY });
    },
  });
};

export const useUpdateHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateHouseRequest }) =>
      houseApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSES_KEY });
    },
  });
};

export const useDeleteHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => houseApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOUSES_KEY });
    },
  });
};

export const useReassignMissingHouses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => houseApi.reassignMissing(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
};
