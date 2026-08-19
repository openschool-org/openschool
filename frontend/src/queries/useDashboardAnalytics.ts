import { useQuery } from "@tanstack/react-query";
import { dashboardAnalyticsApi } from "../services/dashboardAnalytics";

export const useDashboardAnalytics = (enabled = true) =>
  useQuery({
    queryKey: ["dashboard", "analytics"],
    queryFn: () => dashboardAnalyticsApi.get(),
    enabled,
  });

// Same data, fetched via the Principal/Vice Principal's own scoped endpoint.
export const useLeadershipAnalytics = (enabled = true) =>
  useQuery({
    queryKey: ["me", "teacher", "analytics"],
    queryFn: () => dashboardAnalyticsApi.getForLeadership(),
    enabled,
  });
