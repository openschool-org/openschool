import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/features/notifications/api/notification";
import type { CreateNotificationRequest, InboxParams, NotificationHistoryParams } from "@/features/notifications/api/notification";
import { notificationKeys as keys } from "@/features/notifications/keys";
import { useInvalidate } from "@/shared/api/useInvalidate";

// One poll per session: the unread count, every two minutes, only while the tab is visible.
const UNREAD_POLL_MS = 120_000;

// Recipient side

export const useMyNotifications = (options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: keys.mine(),
    queryFn: notificationApi.listMine,
    enabled: options.enabled ?? true,
  });

export const useInbox = (params: InboxParams) =>
  useQuery({ queryKey: keys.inbox(params), queryFn: () => notificationApi.inbox(params), placeholderData: keepPreviousData });

export const useNotificationHistory = (params: NotificationHistoryParams) =>
  useQuery({ queryKey: keys.history(params), queryFn: () => notificationApi.history(params), placeholderData: keepPreviousData });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: keys.unread(),
    queryFn: notificationApi.unreadCount,
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
  });

const useInvalidateMine = () => {
  const invalidate = useInvalidate();
  return () => invalidate(keys.mine(), keys.unread());
};

export const useMarkNotificationRead = () => {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onSuccess: invalidate,
  });
};

export const useMarkAllNotificationsRead = () => {
  const invalidate = useInvalidateMine();
  return useMutation({ mutationFn: notificationApi.markAllRead, onSuccess: invalidate });
};

export const useArchiveNotification = () => {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.archive(notificationId),
    onSuccess: invalidate,
  });
};

export const useUnarchiveNotification = () => {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: (notificationId: string) => notificationApi.unarchive(notificationId),
    onSuccess: invalidate,
  });
};

// Sender side

export const useDraftNotifications = () =>
  useQuery({ queryKey: keys.drafts(), queryFn: notificationApi.listDrafts });

export const useNotificationStats = (id: string) =>
  useQuery({
    queryKey: keys.stats(id),
    queryFn: () => notificationApi.stats(id),
    enabled: !!id,
  });

const useInvalidateSent = () => {
  const invalidate = useInvalidate();
  return () => invalidate(keys.sent(), keys.drafts(), ["notifications", "history"]);
};

export const useCreateNotification = () => {
  const invalidate = useInvalidateSent();
  return useMutation({
    mutationFn: (data: CreateNotificationRequest) => notificationApi.create(data),
    onSuccess: invalidate,
  });
};

export const useSendNotificationDraft = () => {
  const invalidate = useInvalidateSent();
  return useMutation({
    mutationFn: (id: string) => notificationApi.send(id),
    onSuccess: invalidate,
  });
};

export const useDeleteNotificationDraft = () => {
  const invalidate = useInvalidateSent();
  return useMutation({
    mutationFn: (id: string) => notificationApi.remove(id),
    onSuccess: invalidate,
  });
};
