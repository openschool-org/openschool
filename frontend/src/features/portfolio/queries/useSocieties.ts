import { useMutation, useQuery } from "@tanstack/react-query";
import { societyApi } from "@/features/portfolio/api/society";
import type { AssignSocietyMemberRequest, CreateSocietyRequest, UpdateSocietyRequest } from "@/features/portfolio/api/society";
import { portfolioKeys, societyKeys } from "@/features/portfolio/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

export const useSocieties = (academicYearId: string) =>
  useQuery({ queryKey: societyKeys.byYear(academicYearId), queryFn: () => societyApi.listByYear(academicYearId), enabled: !!academicYearId });

// Years with at least one society, for the archive selector.
export const useSocietyYears = () => useQuery({ queryKey: societyKeys.years(), queryFn: () => societyApi.listYears() });

export const useSocietyMembers = (societyId: string) =>
  useQuery({ queryKey: societyKeys.members(societyId), queryFn: () => societyApi.listMembers(societyId), enabled: !!societyId });

export const useMySociety = () => useQuery({ queryKey: societyKeys.mine(), queryFn: societyApi.me, retry: false });

export const useStudentSocietyMemberships = (studentId: string) =>
  useQuery({ queryKey: portfolioKeys.societyMemberships(studentId), queryFn: () => societyApi.listByStudent(studentId), enabled: !!studentId });

export const useCreateSociety = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (data: CreateSocietyRequest) => societyApi.create(data), onSuccess: () => invalidate(societyKeys.all) });
};

export const useUpdateSociety = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateSocietyRequest }) => societyApi.update(id, data), onSuccess: () => invalidate(societyKeys.all) });
};

export const useDeleteSociety = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: ({ id }: { id: string; academicYearId: string }) => societyApi.remove(id), onSuccess: () => invalidate(societyKeys.all) });
};

// Membership changes also touch the student's portfolio list and member_count on the society list.
export const useAssignSocietyMember = (societyId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (data: AssignSocietyMemberRequest) => societyApi.assignMember(societyId, data),
    onSuccess: (data) => invalidate(societyKeys.all, portfolioKeys.societyMemberships(data.student_id)),
  });
};

// Marks a member as left; they stay on the roster's former list and in their portfolio.
export const useDeactivateSocietyMember = (societyId: string) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ memberId, reason }: { memberId: string; studentId: string; reason: string }) => societyApi.deactivateMember(societyId, memberId, reason),
    onSuccess: (_result, variables) => invalidate(societyKeys.all, portfolioKeys.societyMemberships(variables.studentId)),
  });
};
