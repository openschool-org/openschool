import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { societyApi } from "../services/society";
import type { AssignSocietyMemberRequest, CreateSocietyRequest, UpdateSocietyRequest } from "../services/society";

export const societiesKey = (academicYearId: string) => ["societies", academicYearId];

export const useSocieties = (academicYearId: string) =>
  useQuery({
    queryKey: societiesKey(academicYearId),
    queryFn: () => societyApi.listByYear(academicYearId),
    enabled: !!academicYearId,
  });

export const societyYearsKey = ["societies", "years"];

// Academic years that have at least one society — for the archive view's
// year selector, same pattern as usePrefectYears.
export const useSocietyYears = () =>
  useQuery({
    queryKey: societyYearsKey,
    queryFn: () => societyApi.listYears(),
  });

export const societyMembersKey = (societyId: string) => ["societies", societyId, "members"];

export const useSocietyMembers = (societyId: string) =>
  useQuery({
    queryKey: societyMembersKey(societyId),
    queryFn: () => societyApi.listMembers(societyId),
    enabled: !!societyId,
  });

export const MY_SOCIETY_KEY = ["me", "teacher", "society"];

export const useMySociety = () =>
  useQuery({
    queryKey: MY_SOCIETY_KEY,
    queryFn: societyApi.me,
    retry: false,
  });

export const studentSocietyMembershipsKey = (studentId: string) => ["students", studentId, "society-memberships"];

export const useStudentSocietyMemberships = (studentId: string) =>
  useQuery({
    queryKey: studentSocietyMembershipsKey(studentId),
    queryFn: () => societyApi.listByStudent(studentId),
    enabled: !!studentId,
  });

export const useCreateSociety = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSocietyRequest) => societyApi.create(data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: societiesKey(variables.academic_year_id) });
      queryClient.invalidateQueries({ queryKey: societyYearsKey });
    },
  });
};

export const useUpdateSociety = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSocietyRequest }) => societyApi.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: societiesKey(result.academic_year_id) });
    },
  });
};

export const useDeleteSociety = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; academicYearId: string }) => societyApi.remove(id),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: societiesKey(variables.academicYearId) });
      queryClient.invalidateQueries({ queryKey: societyYearsKey });
    },
  });
};

// societyListPrefixKey invalidates every useSocieties list regardless of
// academic year — SocietyRoster (where the member mutations below fire from)
// only knows societyId, not the academic year the roster's society belongs
// to, so a targeted societiesKey(academicYearId) invalidation isn't possible
// from here.
const societyListPrefixKey = ["societies"];

export const useAssignSocietyMember = (societyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignSocietyMemberRequest) => societyApi.assignMember(societyId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: societyMembersKey(societyId) });
      // Keeps the student's portfolio "Society Memberships" list (if
      // already cached from a prior visit) from showing stale data.
      queryClient.invalidateQueries({ queryKey: studentSocietyMembershipsKey(data.student_id) });
      // Refreshes member_count on the society list page.
      queryClient.invalidateQueries({ queryKey: societyListPrefixKey });
    },
  });
};

export const useRemoveSocietyMember = (societyId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId }: { memberId: string; studentId: string }) => societyApi.removeMember(societyId, memberId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: societyMembersKey(societyId) });
      queryClient.invalidateQueries({ queryKey: studentSocietyMembershipsKey(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: societyListPrefixKey });
    },
  });
};
