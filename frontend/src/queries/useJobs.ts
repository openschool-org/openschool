import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../services/jobs";

export const JOBS_KEY = ["jobs"];

// Polls slowly — this is a status panel for background work, not
// interactive data, and a "Run now" or toggle already invalidates it
// immediately on its own.
export const useJobs = () =>
  useQuery({
    queryKey: JOBS_KEY,
    queryFn: jobsApi.list,
    refetchInterval: 30_000,
  });

export const useSetJobEnabled = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) => jobsApi.setEnabled(name, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
};

export const useRunJobNow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => jobsApi.runNow(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOBS_KEY }),
  });
};
