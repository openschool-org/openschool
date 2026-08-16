import { useState } from "react";
import { ActionableNotification } from "@carbon/react";
import { useNavigate } from "react-router";
import { useJobs } from "../../queries/useJobs";

function humanizeJobName(name: string) {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  jobNames: string[];
}

// A lightweight, dismissible nudge surfacing a background agent's most
// recent finding directly on the page it's actionable from (e.g. the
// zero-guardian watcher's result on the Students list) instead of only in
// the central Automation panel. Purely a helper on top of the existing
// /jobs endpoint — no new backend surface, no persisted dismiss state, and
// it renders nothing at all when nothing's been found.
export default function AgentFindingsBanner({ jobNames }: Props) {
  const { data: jobs } = useJobs();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const flagged = (jobs ?? []).filter(
    (j) => jobNames.includes(j.name) && (j.last_run?.findings ?? 0) > 0 && !dismissed.has(j.name),
  );

  if (flagged.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
      {flagged.map((job) => (
        <ActionableNotification
          key={job.name}
          inline
          kind="warning"
          lowContrast
          hideCloseButton={false}
          title={humanizeJobName(job.name)}
          subtitle={job.last_run?.summary}
          actionButtonLabel="View in Automation"
          onActionButtonClick={() => navigate("/automation")}
          onClose={() => setDismissed((prev) => new Set(prev).add(job.name))}
          style={{ maxWidth: "100%" }}
        />
      ))}
    </div>
  );
}
