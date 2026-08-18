// This file renders the StudentPortfolio page, presenting prefect appointments, societies, activities, awards, and disciplinary records in tabbed segments.

import { Tabs, TabList, Tab, TabPanels, TabPanel, Tag } from "@carbon/react";
import { useMyStudentProfile } from "../../queries/useStudentSelf";
import {
  usePrefectAppointmentsByStudent,
  useStudentActivities,
  useLeadershipRoles,
  useStudentAwards,
  useDisciplinaryRecords,
} from "../../queries/useStudentPortfolio";
import { useStudentSocietyMemberships } from "../../queries/useSocieties";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import EmptyState from "../../components/common/EmptyState";
import ErrorMessage from "../../components/common/ErrorMessage";

const SEVERITY_TAG: Record<string, "red" | "magenta" | "cool-gray"> = {
  severe: "red",
  major: "magenta",
  minor: "cool-gray",
};

export default function StudentPortfolio() {
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch } = useMyStudentProfile();
  const studentId = profile?.id ?? "";

  const { data: prefects, isLoading: prefectsLoading } = usePrefectAppointmentsByStudent(studentId);
  const { data: societies, isLoading: societiesLoading } = useStudentSocietyMemberships(studentId);
  const { data: activities, isLoading: activitiesLoading } = useStudentActivities(studentId);
  const { data: leadership, isLoading: leadershipLoading } = useLeadershipRoles(studentId);
  const { data: awards, isLoading: awardsLoading } = useStudentAwards(studentId);
  const { data: discipline, isLoading: disciplineLoading } = useDisciplinaryRecords(studentId);

  const isLoading =
    profileLoading ||
    prefectsLoading ||
    societiesLoading ||
    activitiesLoading ||
    leadershipLoading ||
    awardsLoading ||
    disciplineLoading;

  if (isLoading) return <LoadingSpinner />;
  if (profileError) {
    return (
      <div style={{ padding: "2rem" }}>
        <ErrorMessage message="Failed to load profile" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div className="os-section" style={{ marginBottom: "1.5rem" }}>
        <div className="os-section__header">
          <h2 className="os-section__title">Student Portfolio</h2>
        </div>
      </div>

      <Tabs>
        <TabList aria-label="Student Portfolio Sections">
          <Tab>Prefects & Societies</Tab>
          <Tab>Activities</Tab>
          <Tab>Leadership & Awards</Tab>
          <Tab>Disciplinary Records</Tab>
        </TabList>
        <TabPanels>
          <TabPanel style={{ padding: 0 }}>
            <div style={{ display: "grid", gap: "1.5rem", marginTop: "1rem" }}>
              <div className="os-section">
                <div className="os-section__header">
                  <h3 className="os-section__title" style={{ fontSize: "0.875rem" }}>Prefect Appointments</h3>
                </div>
                <div className="os-section__body" style={{ padding: 0 }}>
                  {!prefects || prefects.length === 0 ? (
                    <div style={{ padding: "1.5rem 1rem" }}>
                      <EmptyState title="No prefect appointments" description="Record of appointments will show up here." />
                    </div>
                  ) : (
                    <table className="os-table">
                      <thead>
                        <tr><th>Year</th><th>Appointment / Rank</th></tr>
                      </thead>
                      <tbody>
                        {prefects.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 500 }}>{p.academic_year_label}</td>
                            <td>{p.rank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="os-section">
                <div className="os-section__header">
                  <h3 className="os-section__title" style={{ fontSize: "0.875rem" }}>Societies & Clubs</h3>
                </div>
                <div className="os-section__body" style={{ padding: 0 }}>
                  {!societies || societies.length === 0 ? (
                    <div style={{ padding: "1.5rem 1rem" }}>
                      <EmptyState title="No society memberships" description="Your clubs and societies memberships will show up here." />
                    </div>
                  ) : (
                    <table className="os-table">
                      <thead>
                        <tr><th>Society</th><th>Role</th><th>Joined Date</th></tr>
                      </thead>
                      <tbody>
                        {societies.map((s) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight: 500 }}>{s.society_name}</td>
                            <td>{s.role ? s.role[0].toUpperCase() + s.role.slice(1) : "Member"}</td>
                            <td className="os-table__mono">{s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel style={{ padding: 0 }}>
            <div className="os-section" style={{ marginTop: "1rem" }}>
              <div className="os-section__header">
                <h3 className="os-section__title" style={{ fontSize: "0.875rem" }}>Co-curricular Activities</h3>
              </div>
              <div className="os-section__body" style={{ padding: 0 }}>
                {!activities || activities.length === 0 ? (
                  <div style={{ padding: "2rem" }}>
                    <EmptyState title="No activities logged" description="Your participation in sports or clubs will show up here." />
                  </div>
                ) : (
                  <table className="os-table">
                    <thead>
                      <tr><th>Activity</th><th>Category</th><th>Role</th><th>Achievement</th></tr>
                    </thead>
                    <tbody>
                      {activities.map((a) => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 500 }}>{a.name}</td>
                          <td>{a.category ? a.category[0].toUpperCase() + a.category.slice(1) : "—"}</td>
                          <td>{a.role || "Participant"}</td>
                          <td>{a.achievement || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabPanel>

          <TabPanel style={{ padding: 0 }}>
            <div style={{ display: "grid", gap: "1.5rem", marginTop: "1rem" }}>
              <div className="os-section">
                <div className="os-section__header">
                  <h3 className="os-section__title" style={{ fontSize: "0.875rem" }}>Leadership Roles</h3>
                </div>
                <div className="os-section__body" style={{ padding: 0 }}>
                  {!leadership || leadership.length === 0 ? (
                    <div style={{ padding: "1.5rem 1rem" }}>
                      <EmptyState title="No leadership roles" description="Class monitor or other leadership roles will show up here." />
                    </div>
                  ) : (
                    <table className="os-table">
                      <thead>
                        <tr><th>Role</th><th>Scope</th><th>Date Assigned</th></tr>
                      </thead>
                      <tbody>
                        {leadership.map((l) => (
                          <tr key={l.id}>
                            <td style={{ fontWeight: 500 }}>{l.title}</td>
                            <td>{l.scope || "School"}</td>
                            <td className="os-table__mono">{l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="os-section">
                <div className="os-section__header">
                  <h3 className="os-section__title" style={{ fontSize: "0.875rem" }}>Awards & Recognition</h3>
                </div>
                <div className="os-section__body" style={{ padding: 0 }}>
                  {!awards || awards.length === 0 ? (
                    <div style={{ padding: "1.5rem 1rem" }}>
                      <EmptyState title="No awards logged" description="Your awards and certifications will show up here." />
                    </div>
                  ) : (
                    <table className="os-table">
                      <thead>
                        <tr><th>Award Title</th><th>Category</th><th>Date Awarded</th><th>Description</th></tr>
                      </thead>
                      <tbody>
                        {awards.map((aw) => (
                          <tr key={aw.id}>
                            <td style={{ fontWeight: 500 }}>{aw.title}</td>
                            <td>{aw.category || "—"}</td>
                            <td className="os-table__mono">{aw.awarded_date ? new Date(aw.awarded_date).toLocaleDateString() : "—"}</td>
                            <td>{aw.description || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel style={{ padding: 0 }}>
            <div className="os-section" style={{ marginTop: "1rem" }}>
              <div className="os-section__header">
                <h3 className="os-section__title" style={{ fontSize: "0.875rem" }}>Disciplinary Records</h3>
              </div>
              <div className="os-section__body" style={{ padding: 0 }}>
                {!discipline || discipline.length === 0 ? (
                  <div style={{ padding: "2rem" }}>
                    <EmptyState title="No disciplinary records" description="Your disciplinary status is clear." />
                  </div>
                ) : (
                  <table className="os-table">
                    <thead>
                      <tr><th>Date</th><th>Incident</th><th>Severity</th><th>Action Taken</th></tr>
                    </thead>
                    <tbody>
                      {discipline.map((d) => (
                        <tr key={d.id}>
                          <td className="os-table__mono">{d.incident_date ? new Date(d.incident_date).toLocaleDateString() : "—"}</td>
                          <td style={{ fontWeight: 500 }}>{d.description}</td>
                          <td>
                            <Tag type={SEVERITY_TAG[d.severity] ?? "cool-gray"} size="sm">
                              {d.severity ? d.severity[0].toUpperCase() + d.severity.slice(1) : "Minor"}
                            </Tag>
                          </td>
                          <td>{d.action_taken || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
