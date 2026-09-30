import api from "@/shared/api/client";

export interface EmailStatus {
  provider: "resend" | "smtp" | "console";
  from: string;
  reply_to: string;
  // set while testing: every email goes to this one inbox
  redirect_to: string;
}

export interface EmailTemplate {
  key: string;
  name: string;
}

export interface EmailPreview {
  subject: string;
  html: string;
  text: string;
}

export const emailApi = {
  status: () => api.get<EmailStatus>("/email/status").then((r) => r.data),
  templates: () => api.get<EmailTemplate[]>("/email/templates").then((r) => r.data),
  preview: (key: string) => api.get<EmailPreview>(`/email/templates/${key}/preview`).then((r) => r.data),
  sendTest: (template: string) => api.post<{ sent_to: string }>("/email/test", { template }).then((r) => r.data),
};
