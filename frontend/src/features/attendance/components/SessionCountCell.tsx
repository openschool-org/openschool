// Count of one status in a session, as plain text like the other table cells.
export default function SessionCountCell({ count }: { count: number | undefined }) {
  return <span>{count ?? 0}</span>;
}
