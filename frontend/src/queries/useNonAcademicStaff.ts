import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { nonAcademicStaffApi } from "../services/nonAcademicStaff";
import type {
  CreateNonAcademicStaffRequest,
  UpdateNonAcademicStaffRequest,
  NonAcademicEmploymentStatus,
} from "../services/nonAcademicStaff";

export const ALL_NON_ACADEMIC_STAFF_KEY = ["non-academic-staff"];
const nonAcademicStaffSearchKey = (search: string, designation: string) => [
  "non-academic-staff",
  "search",
  search,
  designation,
];

export const useNonAcademicStaffList = (search = "", designation = "") =>
  useQuery({
    queryKey: search || designation ? nonAcademicStaffSearchKey(search, designation) : ALL_NON_ACADEMIC_STAFF_KEY,
    queryFn: () => nonAcademicStaffApi.list(search || undefined, designation || undefined),
  });

export const useCreateNonAcademicStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNonAcademicStaffRequest) => nonAcademicStaffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_NON_ACADEMIC_STAFF_KEY });
    },
  });
};

export const useUpdateNonAcademicStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNonAcademicStaffRequest }) =>
      nonAcademicStaffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_NON_ACADEMIC_STAFF_KEY });
    },
  });
};

export const useUpdateNonAcademicStaffEmploymentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: NonAcademicEmploymentStatus }) =>
      nonAcademicStaffApi.updateEmploymentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_NON_ACADEMIC_STAFF_KEY });
    },
  });
};

export const useUpdateNonAcademicStaffHouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, houseId }: { id: string; houseId: string }) =>
      nonAcademicStaffApi.updateHouse(id, houseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_NON_ACADEMIC_STAFF_KEY });
    },
  });
};

export const useDeleteNonAcademicStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => nonAcademicStaffApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALL_NON_ACADEMIC_STAFF_KEY });
    },
  });
};
