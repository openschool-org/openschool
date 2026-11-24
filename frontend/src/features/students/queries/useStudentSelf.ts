import { useQuery } from "@tanstack/react-query";
import { studentSelfApi } from "@/features/students/api/studentSelf";
import { studentKeys } from "@/features/students/keys";

export const useMyStudentProfile = () => useQuery({ queryKey: studentKeys.me.profile(), queryFn: studentSelfApi.profile });

export const useMyAttendance = () => useQuery({ queryKey: studentKeys.me.attendance(), queryFn: studentSelfApi.attendance });

export const useMyMarkHistory = () => useQuery({ queryKey: studentKeys.me.markHistory(), queryFn: studentSelfApi.markHistory });
