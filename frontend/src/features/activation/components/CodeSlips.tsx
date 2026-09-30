import { createPortal } from "react-dom";
import type { GeneratedBatch } from "@/features/activation/api/activation";
import { formatDate } from "@/shared/lib/date";

export default function CodeSlips({ batch }: { batch: GeneratedBatch }) {
  const isStudent = batch.role === "student";
  const idName = isStudent ? "index number" : "NIC number";
  const url = `${window.location.origin}/activate`;
  const expires = formatDate(batch.expires_at);

  return (
    <>
      <table className="os-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>{isStudent ? "Class" : "Children"}</th>
            <th>Code</th>
          </tr>
        </thead>
        <tbody>
          {batch.codes.map((c) => (
            <tr key={c.code}>
              <td>{c.name}</td>
              <td>{c.detail || "-"}</td>
              <td className="os-slip__code">{c.code}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Rendered beside #root so printing can hide the whole app. */}
      {createPortal(
        <div className="os-slip-sheet">
          {batch.codes.map((c) => (
            <div key={c.code} className="os-slip">
              <strong>{c.name}</strong>
              {c.detail && <span className="os-slip__detail">{c.detail}</span>}
              <span className="os-slip__code">{c.code}</span>
              <span>Go to {url}, enter this code and your {idName}, and choose your own password.</span>
              <span className="os-slip__detail">Valid until {expires}. Keep this code private.</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
