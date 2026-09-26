import InfoRow from "@/shared/ui/InfoRow";

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
    { label: "Sessions marked", value: markedCount, color: "var(--os-success)" },
    { label: "Sessions pending", value: pendingCount, color: pendingCount > 0 ? "var(--os-warning)" : "var(--os-text-tertiary)" },
    { label: "My classes", value: myClassCount, color: "var(--os-text-primary)" },
    { label: "Total students", value: totalStudents, color: "var(--os-accent)" },
  ];

  return (
    <div className="os-section">
      <div className="os-section__header">
        <h2 className="os-section__title">Today</h2>
      </div>
      <div className="os-section__body os-py-3 os-px-6">
        {rows.map(({ label, value, color }, i) => (
          <InfoRow key={label} label={label} value={<span style={{ color }}>{value}</span>} bold divider={i < rows.length - 1} />
        ))}
      </div>
    </div>
  );
}
