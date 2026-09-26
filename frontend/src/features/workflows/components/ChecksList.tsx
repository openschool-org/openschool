import { Link } from "react-router";
import { CheckmarkFilled, WarningAltFilled, ErrorFilled } from "@carbon/icons-react";
import type { Check } from "@/features/workflows/api/workflows";

// Preconditions with a fix link each; a failed blocking check stops the workflow.
export default function ChecksList({ checks }: { checks: Check[] }) {
  if (checks.length === 0) return null;
  return (
    <ul className="os-checks" aria-label="Preconditions">
      {checks.map((c) => {
        const Icon = c.ok ? CheckmarkFilled : c.blocking ? ErrorFilled : WarningAltFilled;
        const state = c.ok ? "Passed" : c.blocking ? "Must fix" : "Warning";
        return (
          <li key={c.key} className={`os-checks__item ${c.ok ? "is-ok" : c.blocking ? "is-blocking" : "is-warning"}`}>
            <Icon size={16} aria-hidden="true" />
            <div className="os-flex-1">
              <span className="os-fw-600">{c.title}</span> <span className="os-sr-only">({state})</span>
              {c.detail && <span className="os-c-secondary"> {c.detail}</span>}
            </div>
            {!c.ok && c.fix_path && (
              <Link to={c.fix_path} className="os-table__link os-text-sm">
                Fix
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
