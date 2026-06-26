import { useState } from "react";
import { Button, TextInput, Select, SelectItem, Toggle } from "@carbon/react";
import { Save, Edit, Building, Settings as SettingsIcon } from "@carbon/icons-react";

export default function SettingsPage() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Settings</h1>
          <p className="os-page__subtitle">School configuration and system preferences</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {saved && <span style={{ fontSize: "0.8125rem", color: "#24a148" }}>✓ Saved</span>}
          {editing
            ? <>
                <Button kind="secondary" size="md" onClick={() => setEditing(false)}>Cancel</Button>
                <Button renderIcon={Save} kind="primary" size="md" onClick={handleSave}>Save Changes</Button>
              </>
            : <Button renderIcon={Edit} kind="secondary" size="md" onClick={() => setEditing(true)}>Edit</Button>
          }
        </div>
      </div>

      {/* School Information */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building size={16} style={{ fill: "#406AAF" }} /> School Information
          </h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <TextInput
              id="school-name"
              labelText="School Name"
              defaultValue="Ananda Maha Vidyalaya"
              readOnly={!editing}
            />
            <TextInput
              id="reg-no"
              labelText="Registration Number"
              defaultValue="LK-EDU-00412"
              readOnly={!editing}
            />
            <div style={{ gridColumn: "1 / -1" }}>
              <TextInput
                id="address"
                labelText="Address"
                defaultValue="123, Main Street, Kandy, Sri Lanka"
                readOnly={!editing}
              />
            </div>
            <TextInput
              id="phone"
              labelText="Phone"
              defaultValue="+94 81 223 4567"
              readOnly={!editing}
            />
            <TextInput
              id="email"
              labelText="Email"
              defaultValue="info@anandamv.sch.lk"
              readOnly={!editing}
            />
            <TextInput
              id="principal"
              labelText="Principal"
              defaultValue="Mr. Lalith Perera"
              readOnly={!editing}
            />
            <TextInput
              id="website"
              labelText="Website (optional)"
              defaultValue="www.anandamv.sch.lk"
              readOnly={!editing}
            />
          </div>
        </div>
      </div>

      {/* Academic Settings */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Academic Settings</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            <Select id="timezone" labelText="Time Zone" defaultValue="asia_colombo" disabled={!editing}>
              <SelectItem value="asia_colombo" text="Asia/Colombo (UTC+5:30)" />
              <SelectItem value="utc" text="UTC" />
            </Select>
            <Select id="language" labelText="Default Language" defaultValue="english" disabled={!editing}>
              <SelectItem value="english" text="English" />
              <SelectItem value="sinhala" text="Sinhala" />
              <SelectItem value="tamil" text="Tamil" />
            </Select>
            <Select id="calendar" labelText="Academic Calendar" defaultValue="jan_dec" disabled={!editing}>
              <SelectItem value="jan_dec" text="January — December" />
              <SelectItem value="sep_aug" text="September — August" />
            </Select>
            <Select id="grading" labelText="Grading System" defaultValue="percentage" disabled={!editing}>
              <SelectItem value="percentage" text="Percentage (0–100)" />
              <SelectItem value="grade" text="Grade (A–F)" />
            </Select>
          </div>
        </div>
      </div>

      {/* Attendance Settings */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Attendance Settings</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              { id: "att-late",     label: "Allow Late marking",             sub: "Mark students as Late instead of just Absent" },
              { id: "att-notify",   label: "Absence notifications",          sub: "Notify guardians when a student is marked absent" },
              { id: "att-lock",     label: "Lock sessions after 24 hours",   sub: "Prevent editing attendance after the next day" },
            ].map(({ id, label, sub }) => (
              <div key={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid #f4f4f4" }}>
                <div>
                  <p style={{ margin: "0 0 0.15rem", fontSize: "0.875rem", fontWeight: 500, color: "#161616" }}>{label}</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>{sub}</p>
                </div>
                <Toggle id={id} labelA="Off" labelB="On" defaultToggled={id === "att-late"} disabled={!editing} hideLabel />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">About OpenSchool</h2>
        </div>
        <div className="os-section__body">
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1rem" }}>
            <SettingsIcon size={32} style={{ fill: "#406AAF" }} />
            <div>
              <p style={{ margin: "0 0 0.15rem", fontWeight: 700, fontSize: "1rem", color: "#161616" }}>OpenSchool</p>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>Open-source school management platform for Sri Lanka</p>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
            {[
              ["Version",    "0.1.0 — development build"],
              ["License",    "MIT"],
              ["Repository", "github.com/openschool-org"],
              ["Support",    "github.com/openschool-org/issues"],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: "0.5rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
                <span style={{ color: "#8d8d8d", marginRight: "0.5rem" }}>{label}:</span>
                <span style={{ color: "#161616" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
