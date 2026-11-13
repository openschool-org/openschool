import { Card } from "antd";

const ATTENDANCE_RULES = [
  "Teachers mark students Present, Late or Absent.",
  "Guardians are notified automatically when a student is marked absent.",
  "Sessions lock 24 hours after they are taken. An administrator can still edit them, and every such edit is recorded in the audit log.",
];

// Static attendance rules and product information for the General settings tab.
export default function SystemInfoCards() {
  return (
    <>
      <Card className="os-form-card" title="Attendance rules">
        <ul className="os-settings-rules">
          {ATTENDANCE_RULES.map((text) => <li key={text}>{text}</li>)}
        </ul>
      </Card>
      {/* Brand-coloured so product info reads apart from the school's own settings. */}
      <section className="os-about-card" aria-labelledby="about-openschool">
        <h2 id="about-openschool" className="os-about-card__title">OpenSchool</h2>
        <p className="os-about-card__tagline">Open-source school management</p>
        <dl className="os-about-card__facts">
          {[["Version", "0.1.0 · development build"], ["License", "Apache 2.0"], ["Repository", "github.com/openschool-org"]].map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </section>
    </>
  );
}
