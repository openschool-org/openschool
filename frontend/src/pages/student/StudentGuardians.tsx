// This file renders the StudentGuardians page, displaying the student's linked emergency contacts and guardians.

import { useMyStudentProfile } from "../../queries/useStudentSelf";
import { useGuardiansByStudent } from "../../queries/useGuardians";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";

export default function StudentGuardians() {
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useMyStudentProfile();
  const { data: guardians, isLoading: guardiansLoading, isError: guardiansError, refetch: refetchGuardians } = useGuardiansByStudent(profile?.id ?? "");

  if (profileLoading || guardiansLoading) return <LoadingSpinner />;
  if (profileError || guardiansError) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load guardians" onRetry={() => { refetchProfile(); refetchGuardians(); }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">My Guardians</h2>
        </div>
        <div className="os-section__body" style={{ padding: 0 }}>
          {!guardians || guardians.length === 0 ? (
            <div style={{ padding: "2rem" }}>
              <EmptyState
                title="No guardians linked yet"
                description="Your linked guardians will appear here once configured by the administration."
              />
            </div>
          ) : (
            <table className="os-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Relationship</th>
                  <th>Phone Number</th>
                  <th>Primary Contact</th>
                </tr>
              </thead>
              <tbody>
                {guardians.map((g) => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 500 }}>{g.full_name}</td>
                    <td>{g.relationship ? g.relationship[0].toUpperCase() + g.relationship.slice(1) : "Guardian"}</td>
                    <td className="os-table__mono">{g.phone || "—"}</td>
                    <td>
                      {g.is_primary_contact ? (
                        <span style={{ color: "#24a148", fontWeight: 600 }}>Yes</span>
                      ) : (
                        "No"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
