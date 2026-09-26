import api from "@/shared/api/client";

export type JobRunStatus = "running" | "ok" | "failed";

export interface JobLastRun {
  status: JobRunStatus;
  summary: string;
  findings: number;
  started_at: string;
  finished_at: string | null;
}

// One check an agent runs; finding_title is the notice it sends, pages where it shows as a banner.
export interface AgentCheck {
  key: string;
  title: string;
  description: string;
  finding_title?: string;
  pages?: string[];
}

// Matches automation.JobStatus. Everything shown about an agent comes from here, nothing is hard-coded.
export interface JobStatus {
  name: string;
  title: string;
  description: string;
  schedule: string;
  schedule_label: string;
  can_disable: boolean;
  checks: AgentCheck[];
  enabled: boolean;
  last_run: JobLastRun | null;
}

export interface RunJobResult {
  summary: string;
  findings: number;
}

export interface AgentFinding {
  notification_id: string;
  agent: string;
  check: string;
  title: string;
  message: string;
  sent_at: string;
}

export const jobsApi = {
  // Unread agent notices that belong on this route.
  findings: (page: string) => api.get<AgentFinding[]>("/jobs/findings", { params: { page } }).then((r) => r.data),

  list: () => api.get<JobStatus[]>("/jobs").then((r) => r.data),

  setEnabled: (name: string, enabled: boolean) =>
    api.put(`/jobs/${name}/enabled`, { enabled }).then((r) => r.data),

  runNow: (name: string) => api.post<RunJobResult>(`/jobs/${name}/run`).then((r) => r.data),
};
