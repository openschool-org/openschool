const ACCENT = "#406AAF";

export default function TodaySummary({
  markedCount,
  pendingCount,
  myClassCount,
  totalStudents,
}: {
  markedCount: number;
  pendingCount: number;
  myClassCount: number;
  totalStudents: number;
}) {
  const rows = [
    { label: "Sessions Marked", value: String(markedCount), color: "#24a148" },
    { label: "Sessions Pending", value: String(pendingCount), color: pendingCount > 0 ? "#f1c21b" : "#8d8d8d" },
    { label: "My Classes", value: String(myClassCount), color: "#161616" },
    { label: "Total Students", value: String(totalStudents), color: ACCENT },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Today</h2>
      </div>
      <div className="os-section__body" style={{ padding: "0.75rem 1.5rem" }}>
        {rows.map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid #f4f4f4", fontSize: "0.8125rem" }}>
            <span style={{ color: "#525252" }}>{label}</span>
            <span style={{ fontWeight: 600, color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
