import { Button } from "antd";
import { HomeOutlined } from "@ant-design/icons";
import { useBackfillHomerooms } from "@/features/timetable/queries/useClassrooms";
import { useCurrentAcademicYear } from "@/features/school/queries/useAcademicYears";
import { useToast } from "@/shared/ui/toast/useToast";

// For classes created before homerooms were automatic; safe to press twice.
export default function BackfillHomeroomsButton({ size = "md" }: { size?: "sm" | "md" }) {
  const { data: year } = useCurrentAcademicYear();
  const backfill = useBackfillHomerooms();
  const { showToast } = useToast();

  const run = () => {
    if (!year) return;
    backfill.mutate(year.id, {
      onSuccess: ({ linked }) =>
        showToast({
          kind: "success",
          title: linked ? `Homerooms added to ${linked} class${linked === 1 ? "" : "es"}` : "Every class already has a homeroom",
        }),
      onError: () => showToast({ kind: "error", title: "Could not add homerooms", subtitle: "Please try again." }),
    });
  };

  return (
    <Button icon={<HomeOutlined />} size={size === "sm" ? "small" : "middle"} onClick={run} disabled={!year} loading={backfill.isPending}>
      {backfill.isPending ? "Adding homerooms…" : "Add missing homerooms"}
    </Button>
  );
}
