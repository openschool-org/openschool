import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../../services/notifications/notification";

export const NOTIFICATIONS_KEY = ["notifications", "timetable"];
export const NOTIFICATIONS_UNREAD_KEY = ["notifications", "timetable", "unread-count"];

export const useNotifications = () =>
  useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: notificationApi.list,
    refetchInterval: 60_000,
  });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: NOTIFICATIONS_UNREAD_KEY,
    queryFn: notificationApi.unreadCount,
    refetchInterval: 60_000,
  });

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_UNREAD_KEY });
    },
  });
};
