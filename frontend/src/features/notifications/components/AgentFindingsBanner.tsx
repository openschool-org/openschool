import { useState } from "react";
import { ActionableNotification } from "@carbon/react";
import { useLocation, useNavigate } from "react-router";
import { useAgentFindings } from "@/features/system/queries/useJobs";

// Surfaces a background agent's unread finding on the page it is actionable from.
// The backend decides which findings belong on which page (automation CheckInfo.Pages).
export default function AgentFindingsBanner() {
  const { pathname } = useLocation();
  const { data: findings } = useAgentFindings(pathname);
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const shown = (findings ?? []).filter((f) => !dismissed.has(f.notification_id));
  if (shown.length === 0) return null;

  return (
    <div className="os-flex os-col os-gap-3 os-mb-6">
      {shown.map((f) => (
        <ActionableNotification
          key={f.notification_id}
          inline
          kind="warning"
          lowContrast
          hideCloseButton={false}
          title={f.title}
          subtitle={`${f.message} (${f.agent}: ${f.check})`}
          actionButtonLabel="View automation"
          onActionButtonClick={() => navigate("/settings")}
          onClose={() => setDismissed((prev) => new Set(prev).add(f.notification_id))}
          className="os-max-w-full"
        />
      ))}
    </div>
  );
}
