// Present / absent count for one session; the counts arrive with the class's session list.
export default function SessionCountCell({ count, status }: { count: number | undefined; status: "present" | "absent" }) {
  const n = count ?? 0;
  const tone = status === "present" ? "os-c-success os-fw-600" : n > 0 ? "os-c-danger os-fw-600" : "os-c-tertiary";
  return <span className={tone}>{n}</span>;
}
