import { useQuery } from "@tanstack/react-query";
import { parentApi } from "@/features/parent/api/parent";
import { parentKeys } from "@/features/parent/keys";

export const useMyChildren = () => useQuery({ queryKey: parentKeys.children(), queryFn: parentApi.listChildren });

export const useChildrenSummary = () => useQuery({ queryKey: parentKeys.summary(), queryFn: parentApi.childrenSummary });

export const useChildAttendance = (studentId: string) =>
  useQuery({ queryKey: parentKeys.childAttendance(studentId), queryFn: () => parentApi.childAttendance(studentId), enabled: !!studentId });

export const useChildMarks = (studentId: string, termId: string) =>
  useQuery({
    queryKey: parentKeys.childMarks(studentId, termId),
    queryFn: () => parentApi.childMarks(studentId, termId),
    enabled: !!studentId && !!termId,
  });
