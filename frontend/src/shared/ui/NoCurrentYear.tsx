import EmptyState from "@/shared/ui/EmptyState";

// Empty state for pages that need a current academic year. `before` finishes the hint, e.g. "assigning section heads".
export default function NoCurrentYear({ before }: { before?: string }) {
  const description = before
    ? `Set an academic year as current before ${before}.`
    : "Set an academic year as current first.";
  return <EmptyState title="No current academic year" description={description} />;
}
