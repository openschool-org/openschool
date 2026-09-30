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

// The logo and school name that head every hand-out list and slip.
function Brand({ schoolName, small = false }: { schoolName: string; small?: boolean }) {
  return (
    <div className={small ? "os-code-brand os-code-brand--small" : "os-code-brand"}>
      <img src="/favicon.webp" alt="OpenSchool" />
      <div>
        <strong>{schoolName}</strong>
        <span>OpenSchool account activation</span>
      </div>
    </div>
  );
}

// Print-only sheet, rendered beside #root: per class, a hand-out list (no codes) and then cut-out slips.
export default function CodeSlips({ role, groups, schoolName, expiresAt, withHandOutList }: Props) {
  const isStudent = role === "student";
  const url = `${window.location.origin}/activate`;
  const expires = formatDate(expiresAt);

  return createPortal(
    <div className="os-slip-sheet">
      {groups.map((group) => {
        const classLine = group.formTeacher ? `${group.title} · Class teacher: ${group.formTeacher}` : group.title;
        return (
          <section key={group.key} className="os-code-class">
            {withHandOutList && (
              <div className="os-code-roster">
                <Brand schoolName={schoolName} />
                <h1>{isStudent ? "Student" : "Parent"} activation codes</h1>
                <p><strong>Class:</strong> {group.title}</p>
                {group.formTeacher && <p><strong>Class teacher:</strong> {group.formTeacher}</p>}
                <p>{group.codes.length} {group.codes.length === 1 ? "slip" : "slips"} · valid until {expires}</p>
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
                  <Brand schoolName={schoolName} small />
                  <strong>{c.name}</strong>
                  {!isStudent && <span className="os-slip__detail">Parent of {c.detail}</span>}
                  <span className="os-slip__detail">Class: {classLine}</span>
                  <span className="os-slip__code">{c.code}</span>
                  <span>Go to {url}, enter this code and your {isStudent ? "index number" : "NIC number"}, then choose a password.</span>
                  <span className="os-slip__detail">Valid until {expires}. Keep this code private.</span>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>,
    document.body,
  );
}
