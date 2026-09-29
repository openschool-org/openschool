import { useState } from "react";
import { ActionableNotification, Tag } from "@carbon/react";
import { useLocation, useNavigate } from "react-router";
import { useAgentFindings } from "@/features/system/queries/useJobs";

function formatFinding(message: string) {
  const separator = message.indexOf(":");
  const headline = separator >= 0 ? message.slice(0, separator) : message;
  const details = separator >= 0 ? message.slice(separator + 1).trim() : "";
  const count = headline.match(/^(\d+) class\(es\)/)?.[1];
  // The automation service separates class names with commas. Splitting only
  // before the next "Grade" keeps the attendance metrics inside each item.
  const items = details ? details.split(/,\s(?=Grade\s)/).filter(Boolean) : [];
  return { headline, count, items };
}

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
        <div key={f.notification_id} className="os-agent-finding">
          {(() => {
            const finding = formatFinding(f.message);
            return (
              <>
                <ActionableNotification
                  inline
                  kind="warning"
                  lowContrast
                  hideCloseButton={false}
                  title={f.title}
                  subtitle={finding.headline}
                  actionButtonLabel="View automation"
                  onActionButtonClick={() => navigate("/settings")}
                  onClose={() => setDismissed((prev) => new Set(prev).add(f.notification_id))}
                  className="os-max-w-full"
                />
                {finding.items.length > 0 && (
                  <details className="os-agent-finding__details">
                    <summary>
                      <span>Review affected classes</span>
                      {finding.count && <Tag type="gray" size="sm">{finding.count} classes</Tag>}
                    </summary>
                    <div className="os-agent-finding__list">
                      {finding.items.map((item) => <span key={item}>{item}</span>)}
                    </div>
                  </details>
                )}
              </>
            );
          })()}
        </div>
      ))}
    </div>
  );
}
