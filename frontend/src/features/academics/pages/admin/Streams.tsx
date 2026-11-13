import { useState } from "react";
import { Alert, Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import TextField from "@/shared/ui/TextField";
import { useStreams, useCreateStream } from "@/features/academics/queries/useClasses";
import StreamGroups from "@/features/academics/components/StreamGroups";
import SectionHeadsPanel from "@/features/academics/components/SectionHeadsPanel";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import FormModal from "@/shared/ui/FormModal";
import SectionCard from "@/shared/ui/SectionCard";
import ListRowSkeleton from "@/shared/ui/ListRowSkeleton";
import AgentFindingsBanner from "@/features/notifications/components/AgentFindingsBanner";

export default function Streams() {
  const { data: streams, isLoading, isError, refetch } = useStreams();
  const createStream = useCreateStream();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const create = () => {
    if (!newName.trim()) return;
    createStream.mutate({ name: newName.trim() }, { onSuccess: () => { setNewName(""); setCreateOpen(false); } });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Streams & section heads</h1>
          <p className="os-page__subtitle">A/L streams, their sub-groups and the teacher in charge.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New stream</Button>
      </div>

      <AgentFindingsBanner />

      <SectionCard title="Streams" meta={!isLoading && <span className="os-section__meta">{streams?.length ?? 0} configured</span>} flush>
        {isLoading && <div className="os-py-4 os-px-6"><ListRowSkeleton trailingWidth={null} /></div>}
        {isError && streams && streams.length > 0 && <div className="os-px-6 os-py-3"><Alert type="error" showIcon title="Could not refresh streams" description="Showing the last available stream cards." action={<Button size="small" onClick={() => void refetch()}>Retry</Button>} /></div>}
        {isError && !streams?.length && <ErrorMessage message="Could not load streams." onRetry={refetch} />}
        {!isLoading && !isError && !streams?.length && (
          <EmptyState
            title="No streams yet"
            description="Add A/L streams like Science, Commerce, Arts or Technology."
            action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>New stream</Button>}
          />
        )}
        {!isLoading && streams && streams.length > 0 && (
          <div>{streams.map((s) => <StreamGroups key={s.id} stream={s} />)}</div>
        )}
      </SectionCard>

      <SectionHeadsPanel />

      <FormModal
        open={createOpen}
        title="New stream"
        onClose={() => setCreateOpen(false)}
        onSubmit={create}
        isPending={createStream.isPending}
        pendingLabel="Creating…"
        submitLabel="Create"
        submitDisabled={!newName.trim()}
        isError={createStream.isError}
        error={createStream.error}
        errorFallback="Failed to create stream"
      >
        <TextField id="new-stream-name" label="Stream name" placeholder="e.g. Science, Commerce, Arts, Technology" value={newName} onChange={setNewName} />
      </FormModal>
    </div>
  );
}
