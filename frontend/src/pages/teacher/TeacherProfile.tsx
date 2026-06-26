import { useState } from "react";
import { Button, TextInput, Tag } from "@carbon/react";
import { Edit, Save, Close, Book } from "@carbon/icons-react";

const ACCENT = "#406AAF";

const INITIAL = {
  name: "Priya Rathnayake",
  initials: "PR",
  employeeId: "EMP-0145",
  department: "Science",
  employmentType: "Permanent",
  gender: "Female",
  dob: "1985-07-22",
  nic: "198572234567V",
  phone: "077 345 6789",
  email: "priya.r@school.lk",
  address: "23, Kandy Road, Kelaniya",
  joinDate: "2010-01-15",
  status: "Active",
  subjects: ["Mathematics", "Science"],
};

export default function TeacherProfile() {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(INITIAL);
  const [draft, setDraft] = useState(INITIAL);

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(d => ({ ...d, [key]: e.target.value }));

  const save = () => { setData(draft); setEditing(false); };
  const cancel = () => { setDraft(data); setEditing(false); };

  return (
    <div style={{ background: "#f4f4f4", minHeight: "calc(100vh - 3rem)" }}>
      {/* Profile banner */}
      <div className="os-profile__banner">
        <div className="os-profile__avatar">{data.initials}</div>
        <div style={{ flex: 1 }}>
          <p className="os-profile__name">{data.name}</p>
          <p className="os-profile__meta">
            {data.department} · {data.employmentType} · {data.employeeId}
          </p>
        </div>
        <div className="os-profile__actions">
          <Tag type="blue" size="sm">{data.status}</Tag>
          {!editing
            ? <Button renderIcon={Edit} size="sm" onClick={() => setEditing(true)}>Edit Profile</Button>
            : <>
                <Button renderIcon={Save}  size="sm" onClick={save}>Save</Button>
                <Button renderIcon={Close} size="sm" kind="secondary" onClick={cancel}>Cancel</Button>
              </>}
        </div>
      </div>

      <div style={{ padding: "1.5rem 2rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Main */}
          <div>
            {editing ? (
              /* Edit form */
              <div>
                <div className="os-section">
                  <div className="os-section__header"><h2 className="os-section__title">Personal Details</h2></div>
                  <div className="os-section__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    <TextInput id="p-name"  labelText="Full Name"   value={draft.name}  onChange={set("name")} />
                    <TextInput id="p-gen"   labelText="Gender"       value={draft.gender} onChange={set("gender")} />
                    <TextInput id="p-dob"   labelText="Date of Birth" value={draft.dob}  onChange={set("dob")} />
                    <TextInput id="p-nic"   labelText="NIC"           value={draft.nic}  onChange={set("nic")} />
                    <TextInput id="p-phone" labelText="Phone"         value={draft.phone} onChange={set("phone")} />
                    <TextInput id="p-email" labelText="Email"         value={draft.email} onChange={set("email")} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <TextInput id="p-addr" labelText="Address" value={draft.address} onChange={set("address")} />
                    </div>
                  </div>
                </div>

                <div className="os-section">
                  <div className="os-section__header"><h2 className="os-section__title">Employment</h2></div>
                  <div className="os-section__body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                    <TextInput id="p-dept"  labelText="Department" value={draft.department}    onChange={set("department")} />
                    <TextInput id="p-type"  labelText="Employment Type" value={draft.employmentType} onChange={set("employmentType")} />
                  </div>
                </div>
              </div>
            ) : (
              /* Read view */
              <div>
                <div className="os-section">
                  <div className="os-section__header"><h2 className="os-section__title">Personal Details</h2></div>
                  <div className="os-kv-grid">
                    {[
                      ["Full Name",      data.name],
                      ["Gender",         data.gender],
                      ["Date of Birth",  data.dob],
                      ["NIC",            data.nic],
                      ["Phone",          data.phone],
                      ["Email",          data.email],
                      ["Join Date",      data.joinDate],
                      ["Department",     data.department],
                    ].map(([label, value]) => (
                      <div key={label} className="os-kv-item">
                        <p className="os-kv-item__label">{label}</p>
                        <p className="os-kv-item__value">{value}</p>
                      </div>
                    ))}
                    <div className="os-kv-item" style={{ gridColumn: "1 / -1" }}>
                      <p className="os-kv-item__label">Address</p>
                      <p className="os-kv-item__value">{data.address}</p>
                    </div>
                  </div>
                </div>

                <div className="os-section">
                  <div className="os-section__header"><h2 className="os-section__title">Subjects</h2></div>
                  <div className="os-section__body" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {data.subjects.map(s => (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.875rem", border: "1px solid #e0e0e0", background: "#f4f4f4" }}>
                        <Book size={14} style={{ fill: ACCENT }} />
                        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">Quick Info</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Employee ID",  data.employeeId],
                  ["Status",       data.status],
                  ["Employment",   data.employmentType],
                  ["Department",   data.department],
                  ["Subjects",     data.subjects.length],
                  ["Join Date",    data.joinDate],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 500, color: "#161616" }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="os-section">
              <div className="os-section__header"><h2 className="os-section__title">This Term</h2></div>
              <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
                {[
                  ["Sessions Taken",   "42"],
                  ["Avg Attendance",   "94%"],
                  ["Students Taught",  "74"],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                    <span style={{ color: "#525252" }}>{label}</span>
                    <span style={{ fontWeight: 600, color: ACCENT }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
