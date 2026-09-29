import { useState } from "react";
import { Add } from "@carbon/icons-react";
import { Button, SkeletonText, Tag, TextInput } from "@carbon/react";
import { useStreamGroups, useCreateStreamGroup } from "@/features/academics/queries/useClasses";
import type { Stream } from "@/features/academics/api/stream";
import FormModal from "@/shared/ui/FormModal";

// Sub-groups under one A/L stream. Creation stays in a focused modal so cards remain scannable.
export default function StreamGroups({ stream }: { stream: Stream }) {
  const { data: groups, isLoading } = useStreamGroups(stream.id);
  const createGroup = useCreateStreamGroup();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const add = () => {
    if (!name.trim()) return;
    createGroup.mutate(
      { streamId: stream.id, data: { name: name.trim() } },
      { onSuccess: () => { setName(""); setCreateOpen(false); } },
    );
  };

  return (
    <div className="os-pl-6">
      <div className="os-flex os-wrap os-gap-2 os-mb-2">
        {isLoading ? (
          <SkeletonText width="30%" />
        ) : groups?.length ? (
          groups.map((g) => <Tag key={g.id} type="teal" size="sm">{g.name}</Tag>)
        ) : (
          <span className="os-text-xs os-c-tertiary">No sub-groups</span>
        )}
      </div>
      <Button kind="ghost" size="sm" renderIcon={Add} onClick={() => setCreateOpen(true)}>
        Add subgroup
      </Button>

      <FormModal
        open={createOpen}
        title={`For ${stream.name}, add a subgroup`}
        onClose={() => { setCreateOpen(false); setName(""); createGroup.reset(); }}
        onSubmit={add}
        isPending={createGroup.isPending}
        submitDisabled={!name.trim()}
        submitLabel="Add subgroup"
        pendingLabel="Adding…"
        isError={createGroup.isError}
        error={createGroup.error}
        errorFallback="Could not add this subgroup. Please try again."
      >
        <TextInput
          id={`new-group-${stream.id}`}
          labelText="Subgroup name"
          placeholder="e.g. Physical Science"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormModal>
    </div>
  );
}
