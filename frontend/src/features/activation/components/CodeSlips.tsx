import { createPortal } from "react-dom";
import type { ActivationRole } from "@/features/activation/api/activation";
import type { ClassGroup } from "@/features/activation/lib/codeSheet";
import { formatDate } from "@/shared/lib/date";

interface Props {
  role: ActivationRole;
  groups: ClassGroup[];
  schoolName: string;
  expiresAt: string;
  withHandOutList: boolean;
}

// Print-only sheet, rendered beside #root: per class, a hand-out list (no codes) and then cut-out slips.
export default function CodeSlips({ role, groups, schoolName, expiresAt, withHandOutList }: Props) {
  const isStudent = role === "student";
  const url = `${window.location.origin}/activate`;
  const expires = formatDate(expiresAt);

  return createPortal(
    <div className="os-slip-sheet">
      {groups.map((group) => (
        <section key={group.key} className="os-code-class">
          {withHandOutList && (
            <div className="os-code-roster">
              <p className="os-code-roster__school">{schoolName}</p>
              <h1>{isStudent ? "Student" : "Parent"} activation codes: {group.title}</h1>
              <p>
                {group.formTeacher ? `Form teacher: ${group.formTeacher} · ` : ""}
                {group.codes.length} {group.codes.length === 1 ? "slip" : "slips"} · valid until {expires}
              </p>
              <p>Give each slip only to the person named on it and ask them to sign below. This list has no codes, so it is safe to keep on file.</p>
              <table>
                <thead>
                  <tr>
                    <th>No.</th>
                    <th>Name</th>
                    <th>{isStudent ? "Index no." : "Children"}</th>
                    <th>Received (signature)</th>
                  </tr>
                </thead>
                <tbody>
                  {group.codes.map((c, i) => (
                    <tr key={c.code}>
                      <td>{i + 1}</td>
                      <td>{c.name}</td>
                      <td>{isStudent ? c.index_number : c.detail}</td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="os-slip-grid">
            {group.codes.map((c) => (
              <div key={c.code} className="os-slip">
                <span className="os-slip__detail">{schoolName} · Account activation</span>
                <strong>{c.name}</strong>
                <span className="os-slip__detail">{isStudent ? group.title : `Parent of ${c.detail}`}</span>
                <span className="os-slip__code">{c.code}</span>
                <span>Go to {url}, enter this code and your {isStudent ? "index number" : "NIC number"}, then choose a password.</span>
                <span className="os-slip__detail">Valid until {expires}. Keep this code private.</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>,
    document.body,
  );
}
