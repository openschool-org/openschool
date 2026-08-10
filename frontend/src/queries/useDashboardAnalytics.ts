import { useQuery } from "@tanstack/react-query";
import { dashboardAnalyticsApi } from "../services/dashboardAnalytics";

export const useDashboardAnalytics = () =>
  useQuery({
    queryKey: ["dashboard", "analytics"],
    queryFn: () => dashboardAnalyticsApi.get(),
  });
