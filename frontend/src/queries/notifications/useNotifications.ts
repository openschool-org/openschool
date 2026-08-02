import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../../services/notifications/notification";
import type { CreateNotificationRequest, UpdateNotificationRequest } from "../../services/notifications/notification";

export const MY_NOTIFICATIONS_KEY = ["me", "notifications"];
export const MY_ARCHIVED_NOTIFICATIONS_KEY = ["me", "notifications", "archived"];
export const MY_UNREAD_COUNT_KEY = ["me", "notifications", "unread-count"];
export const SENT_NOTIFICATIONS_KEY = ["notifications", "sent"];
export const DRAFT_NOTIFICATIONS_KEY = ["notifications", "drafts"];
export const notificationStatsKey = (id: string) => ["notifications", id, "stats"];

// Notification Center (recipient side)

export const useMyNotifications = () =>
  useQuery({
    queryKey: MY_NOTIFICATIONS_KEY,
    queryFn: notificationApi.listMine,
    refetchInterval: 60_000,
  });

export const useMyArchivedNotifications = () =>
  useQuery({
    queryKey: MY_ARCHIVED_NOTIFICATIONS_KEY,
    queryFn: notificationApi.listMyArchived,
  });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: MY_UNREAD_COUNT_KEY,
    queryFn: notificationApi.unreadCount,
    refetchInterval: 60_000,
  });

const invalidateMine = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: MY_NOTIFICATIONS_KEY });
  queryClient.invalidateQueries({ queryKey: MY_ARCHIVED_NOTIFICATIONS_KEY });
  queryClient.invalidateQueries({ queryKey: MY_UNREAD_COUNT_KEY });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onSuccess: () => invalidateMine(queryClient),
  });
};

export const useArchiveNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.archive(notificationId),
    onSuccess: () => invalidateMine(queryClient),
  });
};

export const useUnarchiveNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.unarchive(notificationId),
    onSuccess: () => invalidateMine(queryClient),
  });
};

// Composer (sender side)

export const useSentNotifications = () =>
  useQuery({
    queryKey: SENT_NOTIFICATIONS_KEY,
    queryFn: notificationApi.listSent,
  });

export const useDraftNotifications = () =>
  useQuery({
    queryKey: DRAFT_NOTIFICATIONS_KEY,
    queryFn: notificationApi.listDrafts,
  });

export const useNotificationStats = (id: string) =>
  useQuery({
    queryKey: notificationStatsKey(id),
    queryFn: () => notificationApi.stats(id),
    enabled: !!id,
  });

const invalidateSent = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: SENT_NOTIFICATIONS_KEY });
  queryClient.invalidateQueries({ queryKey: DRAFT_NOTIFICATIONS_KEY });
};

export const useCreateNotification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNotificationRequest) => notificationApi.create(data),
    onSuccess: () => invalidateSent(queryClient),
  });
};

export const useUpdateNotificationDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotificationRequest }) => notificationApi.update(id, data),
    onSuccess: () => invalidateSent(queryClient),
  });
};

export const useSendNotificationDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.send(id),
    onSuccess: () => invalidateSent(queryClient),
  });
};

export const useDeleteNotificationDraft = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationApi.remove(id),
    onSuccess: () => invalidateSent(queryClient),
  });
};
