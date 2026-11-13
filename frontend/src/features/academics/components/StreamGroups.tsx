import { useState } from "react";
import { Button, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { SkeletonText } from "@/shared/ui/Skeleton";
import TextField from "@/shared/ui/TextField";
import { useStreamGroups, useCreateStreamGroup } from "@/features/academics/queries/useClasses";
import type { Stream } from "@/features/academics/api/stream";
import FormModal from "@/shared/ui/FormModal";

// One A/L stream as a compact row: name, its sub-groups as tags, and "Add subgroup". Creation stays in a focused modal.
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
    <div className="os-stream-row">
      <span className="os-stream-row__name">{stream.name}</span>
      <div className="os-stream-row__groups">
        {isLoading ? (
          <SkeletonText width="30%" />
        ) : groups?.length ? (
          groups.map((g) => <Tag key={g.id} variant="filled">{g.name}</Tag>)
        ) : (
          <span className="os-text-sm os-c-tertiary">No sub-groups yet</span>
        )}
      </div>
      <Button size="small" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>Add subgroup</Button>

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
        <TextField
          id={`new-group-${stream.id}`}
          label="Subgroup name"
          placeholder="e.g. Physical Science"
          value={name}
          onChange={setName}
        />
      </FormModal>
    </div>
  );
}
