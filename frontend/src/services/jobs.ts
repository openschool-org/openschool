import api from "../lib/api";

export type JobRunStatus = "running" | "ok" | "failed";

export interface JobLastRun {
  status: JobRunStatus;
  summary: string;
  findings: number;
  started_at: string;
  finished_at: string | null;
}

// Matches models.JobStatus — one registered background job (internal/jobs)
// and its current on/off state and most recent run, if any.
export interface JobStatus {
  name: string;
  description: string;
  schedule: string;
  enabled: boolean;
  last_run: JobLastRun | null;
}

export interface RunJobResult {
  summary: string;
  findings: number;
}

export const jobsApi = {
  list: () => api.get<JobStatus[]>("/jobs").then((r) => r.data),

  setEnabled: (name: string, enabled: boolean) =>
    api.put(`/jobs/${name}/enabled`, { enabled }).then((r) => r.data),

  runNow: (name: string) => api.post<RunJobResult>(`/jobs/${name}/run`).then((r) => r.data),
};
