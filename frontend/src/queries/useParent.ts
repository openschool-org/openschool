import { useQuery } from "@tanstack/react-query";
import { parentApi } from "../services/parent";

export const useMyChildren = () =>
  useQuery({
    queryKey: ["my-children"],
    queryFn: parentApi.listChildren,
  });

export const useChildAttendance = (studentId: string) =>
  useQuery({
    queryKey: ["child-attendance", studentId],
    queryFn: () => parentApi.childAttendance(studentId),
    enabled: !!studentId,
  });

export const useChildMarks = (studentId: string, termId: string) =>
  useQuery({
    queryKey: ["child-marks", studentId, termId],
    queryFn: () => parentApi.childMarks(studentId, termId),
    enabled: !!studentId && !!termId,
  });
