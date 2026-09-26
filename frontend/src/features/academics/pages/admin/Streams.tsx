import { useState } from "react";
import { Layers, Add } from "@carbon/icons-react";
import { Button, TextInput, SkeletonText } from "@carbon/react";
import { useStreams, useCreateStream } from "@/features/academics/queries/useClasses";
import StreamGroups from "@/features/academics/components/StreamGroups";
import SectionHeadsPanel from "@/features/academics/components/SectionHeadsPanel";
import ErrorMessage from "@/shared/ui/ErrorMessage";
import EmptyState from "@/shared/ui/EmptyState";
import FormModal from "@/shared/ui/FormModal";
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
        <Button renderIcon={Add} kind="primary" size="md" onClick={() => setCreateOpen(true)}>New stream</Button>
      </div>

      <AgentFindingsBanner titles={["Streams with no current-year classes"]} />

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Streams</h2>
        </div>
        {isLoading && <div className="os-py-5 os-px-6"><SkeletonText width="40%" /></div>}
        {isError && <ErrorMessage message="Could not load streams." onRetry={refetch} />}
        {!isLoading && !isError && !streams?.length && (
          <EmptyState
            title="No streams yet"
            description="Add A/L streams like Science, Commerce, Arts or Technology."
            action={<Button renderIcon={Add} kind="primary" onClick={() => setCreateOpen(true)}>New stream</Button>}
          />
        )}
        {streams?.map((s) => (
          <div key={s.id} className="os-list-row os-items-start os-col os-py-4 os-px-6">
            <div className="os-flex os-items-center os-gap-2 os-mb-2">
              <Layers size={16} className="os-fill-accent" />
              <span className="os-fw-600 os-text-md os-c-primary">{s.name}</span>
            </div>
            <StreamGroups stream={s} />
          </div>
        ))}
      </div>

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
        <TextInput id="new-stream-name" labelText="Stream name" placeholder="e.g. Science, Commerce, Arts, Technology" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </FormModal>
    </div>
  );
}
