import { useMutation, useQuery } from "@tanstack/react-query";
import { jobsApi } from "@/features/system/api/jobs";
import { systemKeys } from "@/features/system/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

// Admin-only status panel; a slow poll while the page is open is enough.
export const useJobs = () =>
  useQuery({ queryKey: systemKeys.jobs(), queryFn: jobsApi.list, refetchInterval: 60_000, refetchIntervalInBackground: false });

export const useSetJobEnabled = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) => jobsApi.setEnabled(name, enabled),
    onSuccess: () => invalidate(systemKeys.jobs()),
  });
};

export const useRunJobNow = () => {
  const invalidate = useInvalidate();
  return useMutation({ mutationFn: (name: string) => jobsApi.runNow(name), onSuccess: () => invalidate(systemKeys.jobs()) });
};

export const useAgentFindings = (page: string) =>
  useQuery({ queryKey: systemKeys.findings(page), queryFn: () => jobsApi.findings(page), staleTime: 60_000 });
