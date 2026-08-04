import api from "../../lib/api";

export type RecipientRuleType =
  | "everyone"
  | "grade"
  | "class"
  | "grade_section"
  | "subject"
  | "student"
  | "guardian"
  | "teacher";

export type SubjectAudience = "students" | "teachers";

export interface RecipientRule {
  type: RecipientRuleType;
  label?: string;
  grade_id?: string;
  class_id?: string;
  grade_section_id?: string;
  subject_id?: string;
  subject_audience?: SubjectAudience;
  student_id?: string;
  guardian_id?: string;
  teacher_id?: string;
}

export type NotificationCategory =
  | "general"
  | "academic"
  | "examination"
  | "attendance"
  | "timetable"
  | "events"
  | "sports"
  | "meetings"
  | "fee_reminder"
  | "emergency"
  | "discipline"
  | "holidays";

export type NotificationPriority = "normal" | "important" | "urgent";

export const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: "general", label: "General Announcement" },
  { value: "academic", label: "Academic" },
  { value: "examination", label: "Examination" },
  { value: "attendance", label: "Attendance" },
  { value: "timetable", label: "Timetable" },
  { value: "events", label: "Events" },
  { value: "sports", label: "Sports" },
  { value: "meetings", label: "Meetings" },
  { value: "fee_reminder", label: "Fee Reminder" },
  { value: "emergency", label: "Emergency" },
  { value: "discipline", label: "Discipline" },
  { value: "holidays", label: "Holidays" },
];

export const PRIORITIES: { value: NotificationPriority; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

export interface CreateNotificationRequest {
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  save_as_draft: boolean;
  recipient_rules: RecipientRule[];
}

export type UpdateNotificationRequest = Omit<CreateNotificationRequest, "save_as_draft">;

export interface Notification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: "draft" | "sent";
  recipient_rules: RecipientRule[];
  sender_name?: string;
  sent_at: string | null;
  created_at: string | null;
}

export interface NotificationStats {
  total: number;
  read: number;
  unread: number;
}

export interface MyNotification {
  recipient_id: string;
  notification_id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  sender_name: string;
  sent_at: string;
  is_read: boolean;
  is_archived: boolean;
}

export const notificationApi = {
  create: (data: CreateNotificationRequest) =>
    api.post<Notification>("/notifications", data).then((r) => r.data),

  update: (id: string, data: UpdateNotificationRequest) =>
    api.put<Notification>(`/notifications/${id}`, data).then((r) => r.data),

  send: (id: string) => api.post<Notification>(`/notifications/${id}/send`).then((r) => r.data),

  remove: (id: string) => api.delete(`/notifications/${id}`).then((r) => r.data),

  listSent: () => api.get<Notification[]>("/notifications/sent").then((r) => r.data),

  listDrafts: () => api.get<Notification[]>("/notifications/drafts").then((r) => r.data),

  stats: (id: string) => api.get<NotificationStats>(`/notifications/${id}/stats`).then((r) => r.data),

  listMine: () => api.get<MyNotification[]>("/me/notifications").then((r) => r.data),

  listMyArchived: () => api.get<MyNotification[]>("/me/notifications/archived").then((r) => r.data),

  unreadCount: () =>
    api.get<{ unread_count: number }>("/me/notifications/unread-count").then((r) => r.data.unread_count),

  markRead: (notificationId: string) =>
    api.post(`/me/notifications/${notificationId}/read`).then((r) => r.data),

  archive: (notificationId: string) =>
    api.post(`/me/notifications/${notificationId}/archive`).then((r) => r.data),

  unarchive: (notificationId: string) =>
    api.post(`/me/notifications/${notificationId}/unarchive`).then((r) => r.data),
};
