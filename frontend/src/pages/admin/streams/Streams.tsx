import { useMemo, useState } from "react";
import { Layers, Add, UserFollow } from "@carbon/icons-react";
import {
  Button,
  TextInput,
  Tag,
  InlineNotification,
  ComposedModal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  SkeletonText,
} from "@carbon/react";
import {
  useStreams,
  useStreamGroups,
  useCreateStream,
  useCreateStreamGroup,
  useCurrentClasses,
} from "../../../queries/useClasses";
import { useCurrentAcademicYear } from "../../../queries/useAcademicYears";
import { useTeachers } from "../../../queries/useTeachers";
import { useSectionHeads, useAssignSectionHead } from "../../../queries/useSectionHeads";
import { getErrorMessage } from "../../../lib/errorMessage";
import ErrorMessage from "../../../components/common/ErrorMessage";
import EmptyState from "../../../components/common/EmptyState";
import EntityCombobox from "../../../components/common/EntityCombobox";
import type { Stream } from "../../../services/stream";

function StreamGroups({ stream }: { stream: Stream }) {
  const { data: groups, isLoading } = useStreamGroups(stream.id);
  const createGroup = useCreateStreamGroup();
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    createGroup.mutate(
      { streamId: stream.id, data: { name: name.trim() } },
      { onSuccess: () => setName("") },
    );
  };

  return (
    <div style={{ paddingLeft: "1.5rem" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
        {isLoading ? (
          <SkeletonText width="30%" />
        ) : groups && groups.length > 0 ? (
          groups.map((g) => (
            <Tag key={g.id} type="teal" size="sm">
              {g.name}
            </Tag>
          ))
        ) : (
          <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>No sub-groups</span>
        )}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <TextInput
          id={`new-group-${stream.id}`}
          labelText=""
          placeholder="e.g. Physical Science"
          size="sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ maxWidth: "14rem" }}
        />
        <Button kind="ghost" size="sm" renderIcon={Add} disabled={!name.trim() || createGroup.isPending} onClick={handleAdd}>
          Add group
        </Button>
      </div>
    </div>
  );
}

export default function Streams() {
  const { data: streams, isLoading, isError, refetch } = useStreams();
  const createStream = useCreateStream();
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: classes } = useCurrentClasses();
  const { data: teachers } = useTeachers();
  const { data: sectionHeads } = useSectionHeads(currentYear?.id ?? "");
  const assignSectionHead = useAssignSectionHead();

  const [createOpen, setCreateOpen] = useState(false);
  const [newStreamName, setNewStreamName] = useState("");

  const handleCreateStream = () => {
    if (!newStreamName.trim()) return;
    createStream.mutate(
      { name: newStreamName.trim() },
      { onSuccess: () => { setNewStreamName(""); setCreateOpen(false); } },
    );
  };

  // Derive section-head rows from the classes that actually exist this
  // year: a grade with any class carrying a stream_id gets one row per
  // stream in use; every other grade gets a single whole-grade row.
  const sectionHeadRows = useMemo(() => {
    type Row = { key: string; gradeId: string; gradeName: string; streamId: string | null; streamName: string | null };
    const byGrade = new Map<string, { gradeName: string; streamIds: Map<string, string> }>();
    for (const c of classes ?? []) {
      if (!byGrade.has(c.grade_id)) byGrade.set(c.grade_id, { gradeName: c.grade_name, streamIds: new Map() });
      if (c.stream_id) {
        const streamName = streams?.find((s) => s.id === c.stream_id)?.name ?? "Stream";
        byGrade.get(c.grade_id)!.streamIds.set(c.stream_id, streamName);
      }
    }
    const rows: Row[] = [];
    for (const [gradeId, { gradeName, streamIds }] of byGrade) {
      if (streamIds.size === 0) {
        rows.push({ key: gradeId, gradeId, gradeName, streamId: null, streamName: null });
      } else {
        for (const [streamId, streamName] of streamIds) {
          rows.push({ key: `${gradeId}-${streamId}`, gradeId, gradeName, streamId, streamName });
        }
      }
    }
    return rows.sort((a, b) => a.gradeName.localeCompare(b.gradeName) || (a.streamName ?? "").localeCompare(b.streamName ?? ""));
  }, [classes, streams]);

  const currentHeadFor = (gradeId: string, streamId: string | null) =>
    sectionHeads?.find((sh) => sh.grade_id === gradeId && sh.stream_id === streamId);

  const handleAssign = (gradeId: string, streamId: string | null, teacherId: string) => {
    if (!currentYear || !teacherId) return;
    assignSectionHead.mutate({
      academic_year_id: currentYear.id,
      grade_id: gradeId,
      stream_id: streamId,
      teacher_id: teacherId,
    });
  };

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Streams & Section Heads</h1>
          <p className="os-page__subtitle">
            A/L streams (with their sub-groups) and the teacher-in-charge for each grade or stream.
          </p>
        </div>
        <Button renderIcon={Add} kind="primary" size="md" onClick={() => setCreateOpen(true)}>
          New Stream
        </Button>
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Streams</h2>
        </div>

        {isLoading && (
          <div style={{ padding: "1.25rem 1.5rem" }}>
            <SkeletonText width="40%" />
          </div>
        )}
        {isError && <ErrorMessage message="Could not load streams." onRetry={refetch} />}

        {!isLoading && !isError && (!streams || streams.length === 0) && (
          <EmptyState
            title="No streams yet"
            description="Add A/L streams like Science, Commerce, Arts or Technology."
            action={
              <Button renderIcon={Add} kind="primary" onClick={() => setCreateOpen(true)}>
                New Stream
              </Button>
            }
          />
        )}

        {!isLoading && streams && streams.length > 0 && (
          <div>
            {streams.map((s, i) => (
              <div
                key={s.id}
                style={{ padding: "1rem 1.5rem", borderBottom: i < streams.length - 1 ? "1px solid #e0e0e0" : "none" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Layers size={16} style={{ fill: "#406AAF" }} />
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#161616" }}>{s.name}</span>
                </div>
                <StreamGroups stream={s} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="os-section">
        <div className="os-section__header">
          <h2 className="os-section__title">Section Heads (Teachers in Charge)</h2>
          {currentYear && (
            <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{currentYear.label}</span>
          )}
        </div>

        {!currentYear ? (
          <EmptyState
            title="No current academic year"
            description="Set an academic year as current before assigning section heads."
          />
        ) : sectionHeadRows.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Section heads are derived from the grades and streams your classes actually use."
          />
        ) : (
          <div>
            {sectionHeadRows.map((row, i) => {
              const head = currentHeadFor(row.gradeId, row.streamId);
              return (
                <div
                  key={row.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem 1.5rem",
                    borderBottom: i < sectionHeadRows.length - 1 ? "1px solid #f4f4f4" : "none",
                  }}
                >
                  <UserFollow size={16} style={{ fill: "#8d8d8d", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: 500, color: "#161616" }}>
                      {row.gradeName}
                      {row.streamName ? ` - ${row.streamName}` : ""}
                    </p>
                    {head && (
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252" }}>
                        Current: {head.teacher_name}
                      </p>
                    )}
                  </div>
                  <div style={{ width: "16rem" }}>
                    <EntityCombobox
                      id={`tic-${row.key}`}
                      items={teachers ?? []}
                      selectedId={head?.teacher_id ?? ""}
                      onSelect={(id) => handleAssign(row.gradeId, row.streamId, id)}
                      getId={(t) => t.id}
                      itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
                      placeholder="Search teachers…"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {assignSectionHead.isError && (
          <InlineNotification
            kind="error"
            title="Could not assign section head"
            subtitle={getErrorMessage(assignSectionHead.error, "Please try again.")}
            lowContrast
            onClose={() => assignSectionHead.reset()}
            style={{ maxWidth: "100%", margin: "0 1.5rem 1rem" }}
          />
        )}
      </div>

      <ComposedModal open={createOpen} size="sm" onClose={() => setCreateOpen(false)}>
        <ModalHeader title="New stream" />
        <ModalBody>
          {createStream.isError && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={getErrorMessage(createStream.error, "Failed to create stream")}
              lowContrast
              hideCloseButton
              style={{ marginBottom: "1rem", maxWidth: "100%" }}
            />
          )}
          <TextInput
            id="new-stream-name"
            labelText="Stream name"
            placeholder="e.g. Science, Commerce, Arts, Technology"
            value={newStreamName}
            onChange={(e) => setNewStreamName(e.target.value)}
          />
        </ModalBody>
        <ModalFooter>
          <Button kind="secondary" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button kind="primary" onClick={handleCreateStream} disabled={!newStreamName.trim() || createStream.isPending}>
            {createStream.isPending ? "Creating…" : "Create"}
          </Button>
        </ModalFooter>
      </ComposedModal>
    </div>
  );
}
