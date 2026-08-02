import api from "../../lib/api";

export interface TimetableNotification {
  id: string;
  user_id: string;
  timetable_id: string | null;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationApi = {
  list: () => api.get<TimetableNotification[]>("/notifications/timetable").then((r) => r.data),

  unreadCount: () =>
    api.get<{ unread_count: number }>("/notifications/timetable/unread-count").then((r) => r.data.unread_count),

  markRead: (id: string) => api.post(`/notifications/timetable/${id}/read`).then((r) => r.data),
};
