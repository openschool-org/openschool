const TONE: Record<string, string> = { present: "os-c-success", absent: "os-c-danger", late: "os-c-warning-text" };

// Count of one status in a session; the counts arrive with the class's session list.
export default function SessionCountCell({ count, status }: { count: number | undefined; status: "present" | "absent" | "late" }) {
  const n = count ?? 0;
  const tone = status === "present" || n > 0 ? `${TONE[status]} os-fw-600` : "os-c-tertiary";
  return <span className={tone}>{n}</span>;
}
