import { useMemo, useState } from "react";
import {
  Button,
  TextInput,
  TextArea,
  Dropdown,
  Tag,
  InlineNotification,
  SkeletonText,
} from "@carbon/react";
import { Add, Send, Save, TrashCan } from "@carbon/icons-react";
import { useCurrentAcademicYear } from "../../queries/useAcademicYears";
import { useGrades } from "../../queries/useGrades";
import { useCurrentClasses } from "../../queries/useClasses";
import { useGradeSections } from "../../queries/timetable/useGradeSections";
import { useSubjects } from "../../queries/useSubjects";
import { useStudents } from "../../queries/useStudents";
import { useGuardians } from "../../queries/useGuardians";
import { useTeachers } from "../../queries/useTeachers";
import {
  useSentNotifications,
  useDraftNotifications,
  useCreateNotification,
  useSendNotificationDraft,
  useDeleteNotificationDraft,
  useNotificationStats,
} from "../../queries/notifications/useNotifications";
import { CATEGORIES, PRIORITIES } from "../../services/notifications/notification";
import type {
  RecipientRule,
  RecipientRuleType,
  NotificationCategory,
  NotificationPriority,
  Notification,
} from "../../services/notifications/notification";
import { getErrorMessage } from "../../lib/errorMessage";
import EntityCombobox from "../../components/common/EntityCombobox";
import EmptyState from "../../components/common/EmptyState";
import { useRole } from "../../hooks/useRole";
import { useMyPosition } from "../../queries/usePositions";

const ACCENT = "#406AAF";

const RULE_TYPES: { value: RecipientRuleType; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "grade", label: "By Grade" },
  { value: "class", label: "By Class" },
  { value: "grade_section", label: "By Grade Section" },
  { value: "subject", label: "By Subject" },
  { value: "student", label: "Specific Student" },
  { value: "guardian", label: "Specific Guardian" },
  { value: "teacher", label: "Specific Teacher" },
];

function RecipientPicker({
  onAdd,
  canBroadcastEveryone,
}: {
  onAdd: (rule: RecipientRule) => void;
  canBroadcastEveryone: boolean;
}) {
  const { data: currentYear } = useCurrentAcademicYear();
  const { data: grades } = useGrades();
  const { data: classes } = useCurrentClasses();
  const { data: gradeSections } = useGradeSections(currentYear?.id ?? "");
  const { data: subjects } = useSubjects();
  const { data: students } = useStudents();
  const { data: guardians } = useGuardians();
  const { data: teachers } = useTeachers();

  const [ruleType, setRuleType] = useState<RecipientRuleType>("grade");
  const [selectedId, setSelectedId] = useState("");
  const [subjectAudience, setSubjectAudience] = useState<"students" | "teachers">("students");

  const reset = () => setSelectedId("");

  const availableRuleTypes = canBroadcastEveryone ? RULE_TYPES : RULE_TYPES.filter((r) => r.value !== "everyone");

  const handleAdd = () => {
    if (ruleType === "everyone") {
      onAdd({ type: "everyone", label: "Everyone" });
      return;
    }
    if (!selectedId) return;

    if (ruleType === "grade") {
      const grade = grades?.find((g) => g.id === selectedId);
      onAdd({ type: "grade", grade_id: selectedId, label: grade?.name ?? "Grade" });
    } else if (ruleType === "class") {
      const cls = classes?.find((c) => c.id === selectedId);
      onAdd({ type: "class", class_id: selectedId, label: cls ? `${cls.grade_name} - ${cls.name}` : "Class" });
    } else if (ruleType === "grade_section") {
      const section = gradeSections?.find((s) => s.id === selectedId);
      onAdd({ type: "grade_section", grade_section_id: selectedId, label: section?.name ?? "Grade Section" });
    } else if (ruleType === "subject") {
      const subject = subjects?.find((s) => s.id === selectedId);
      onAdd({
        type: "subject",
        subject_id: selectedId,
        subject_audience: subjectAudience,
        label: `${subject?.name ?? "Subject"} (${subjectAudience === "teachers" ? "Teachers" : "Students"})`,
      });
    } else if (ruleType === "student") {
      const student = students?.find((s) => s.id === selectedId);
      onAdd({ type: "student", student_id: selectedId, label: student?.full_name ?? "Student" });
    } else if (ruleType === "guardian") {
      const guardian = guardians?.find((g) => g.id === selectedId);
      onAdd({ type: "guardian", guardian_id: selectedId, label: guardian?.full_name ?? "Guardian" });
    } else if (ruleType === "teacher") {
      const teacher = teachers?.find((t) => t.id === selectedId);
      onAdd({ type: "teacher", teacher_id: selectedId, label: teacher?.full_name ?? "Teacher" });
    }
    reset();
  };

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <Dropdown
        id="recipient-rule-type"
        titleText="Recipient type"
        label="Choose…"
        items={availableRuleTypes}
        itemToString={(item) => (item as (typeof RULE_TYPES)[number])?.label ?? ""}
        selectedItem={availableRuleTypes.find((r) => r.value === ruleType)}
        onChange={({ selectedItem }) => {
          setRuleType((selectedItem as (typeof RULE_TYPES)[number]).value);
          reset();
        }}
      />

      {ruleType === "grade" && (
        <EntityCombobox
          id="rule-grade"
          items={grades ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(g) => g.id}
          itemToString={(g) => g.name}
          placeholder="Search grades…"
        />
      )}
      {ruleType === "class" && (
        <EntityCombobox
          id="rule-class"
          items={classes ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(c) => c.id}
          itemToString={(c) => `${c.grade_name} - ${c.name}`}
          placeholder="Search classes…"
        />
      )}
      {ruleType === "grade_section" && (
        <EntityCombobox
          id="rule-grade-section"
          items={gradeSections ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(s) => s.id}
          itemToString={(s) => s.name}
          placeholder="Search grade sections…"
        />
      )}
      {ruleType === "subject" && (
        <>
          <EntityCombobox
            id="rule-subject"
            items={subjects ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            getId={(s) => s.id}
            itemToString={(s) => s.name}
            placeholder="Search subjects…"
          />
          <Dropdown
            id="rule-subject-audience"
            titleText="Audience"
            label=""
            items={["students", "teachers"]}
            itemToString={(item) => (item === "teachers" ? "Teachers of this subject" : "Students taking this subject")}
            selectedItem={subjectAudience}
            onChange={({ selectedItem }) => setSubjectAudience((selectedItem as "students" | "teachers") ?? "students")}
          />
        </>
      )}
      {ruleType === "student" && (
        <EntityCombobox
          id="rule-student"
          items={students ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(s) => s.id}
          itemToString={(s) => `${s.full_name} — ${s.index_number}`}
          placeholder="Search students…"
        />
      )}
      {ruleType === "guardian" && (
        <EntityCombobox
          id="rule-guardian"
          items={guardians ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(g) => g.id}
          itemToString={(g) => `${g.full_name} — ${g.phone}`}
          placeholder="Search guardians…"
        />
      )}
      {ruleType === "teacher" && (
        <EntityCombobox
          id="rule-teacher"
          items={teachers ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getId={(t) => t.id}
          itemToString={(t) => `${t.full_name} — ${t.employee_number}`}
          placeholder="Search teachers…"
        />
      )}

      <Button kind="ghost" size="sm" renderIcon={Add} onClick={handleAdd} disabled={ruleType !== "everyone" && !selectedId}>
        Add recipient
      </Button>
    </div>
  );
}

function SentHistoryRow({ notification }: { notification: Notification }) {
  const [expanded, setExpanded] = useState(false);
  const { data: stats } = useNotificationStats(expanded ? notification.id : "");

  return (
    <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #f4f4f4", cursor: "pointer" }} onClick={() => setExpanded((e) => !e)}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
        <Tag type="blue" size="sm">
          {notification.category}
        </Tag>
        <span style={{ fontWeight: 500, fontSize: "0.8125rem" }}>{notification.title}</span>
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#8d8d8d" }}>
          {notification.sent_at ? new Date(notification.sent_at).toLocaleString() : ""}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: "0.75rem",
          color: "#525252",
          lineHeight: 1.5,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {notification.message}
      </p>
      {expanded && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#161616" }}>
          {stats ? (
            <span>
              Recipients: <strong>{stats.total}</strong> &middot; Read: <strong>{stats.read}</strong> &middot; Unread: <strong>{stats.unread}</strong>
            </span>
          ) : (
            <SkeletonText width="40%" />
          )}
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft }: { draft: Notification }) {
  const send = useSendNotificationDraft();
  const remove = useDeleteNotificationDraft();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid #f4f4f4" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 0.125rem", fontWeight: 500, fontSize: "0.8125rem" }}>{draft.title}</p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#8d8d8d" }}>{draft.recipient_rules.length} recipient rule(s)</p>
      </div>
      <Button kind="ghost" size="sm" renderIcon={Send} onClick={() => send.mutate(draft.id)} disabled={send.isPending}>
        Send
      </Button>
      <Button kind="danger--ghost" size="sm" renderIcon={TrashCan} onClick={() => remove.mutate(draft.id)} disabled={remove.isPending}>
        Delete
      </Button>
    </div>
  );
}

export default function NotificationComposer() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("general");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [rules, setRules] = useState<RecipientRule[]>([]);

  const { role } = useRole();
  const { data: myPosition } = useMyPosition(role === "teacher");
  // Everyone-broadcast mirrors the backend's authorizeSender: admin always,
  // a teacher only when Principal or a whole-school-granted Vice Principal.
  const canBroadcastEveryone = role === "admin" || !!myPosition?.notify_whole_school;

  const create = useCreateNotification();
  const { data: sent, isLoading: sentLoading } = useSentNotifications();
  const { data: drafts } = useDraftNotifications();

  const isReady = title.trim().length > 0 && message.trim().length > 0 && rules.length > 0;

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setCategory("general");
    setPriority("normal");
    setRules([]);
  };

  const handleSubmit = (saveAsDraft: boolean) => {
    create.mutate(
      {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        save_as_draft: saveAsDraft,
        recipient_rules: rules,
      },
      { onSuccess: () => resetForm() },
    );
  };

  const removeRule = (index: number) => setRules((r) => r.filter((_, i) => i !== index));

  const sentList = useMemo(() => sent ?? [], [sent]);

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Notifications</h1>
          <p className="os-page__subtitle">
            Send in-app announcements to any combination of grades, classes, subjects, or individuals.
            {role === "teacher" && myPosition && myPosition.rank_label !== "Teacher" && (
              <> Sending as <strong>{myPosition.rank_label}</strong>{canBroadcastEveryone ? " — whole-school reach." : "."}</>
            )}
          </p>
        </div>
      </div>

      {create.isError && (
        <InlineNotification
          kind="error"
          title="Could not send notification"
          subtitle={getErrorMessage(create.error)}
          lowContrast
          onClose={() => create.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}
      {create.isSuccess && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle="Notification saved."
          lowContrast
          onClose={() => create.reset()}
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Compose */}
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Compose</h2>
          </div>
          <div className="os-section__body" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <TextInput id="notification-title" labelText="Title" placeholder="e.g. Term Test Timetable Released" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextArea id="notification-message" labelText="Message" placeholder="Type your message here…" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <Dropdown
                id="notification-category"
                titleText="Category"
                label=""
                items={CATEGORIES}
                itemToString={(item) => (item as (typeof CATEGORIES)[number])?.label ?? ""}
                selectedItem={CATEGORIES.find((c) => c.value === category)}
                onChange={({ selectedItem }) => setCategory((selectedItem as (typeof CATEGORIES)[number]).value)}
              />
              <div>
                <p style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", color: "#525252" }}>Priority</p>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      style={{
                        padding: "0.5rem 0.875rem",
                        border: `1.5px solid ${priority === p.value ? ACCENT : "#e0e0e0"}`,
                        background: priority === p.value ? "#eef2f9" : "#ffffff",
                        color: priority === p.value ? ACCENT : "#525252",
                        fontWeight: priority === p.value ? 600 : 400,
                        fontSize: "0.8125rem",
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#525252", marginBottom: "0.75rem" }}>
                Send To
              </p>
              {rules.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.75rem" }}>
                  {rules.map((rule, i) => (
                    <Tag key={i} type="teal" size="sm" filter onClose={() => removeRule(i)}>
                      {rule.label ?? rule.type}
                    </Tag>
                  ))}
                </div>
              )}
              <RecipientPicker onAdd={(rule) => setRules((r) => [...r, rule])} canBroadcastEveryone={canBroadcastEveryone} />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <Button renderIcon={Send} kind="primary" onClick={() => handleSubmit(false)} disabled={!isReady || create.isPending}>
                {create.isPending ? "Sending…" : "Send Now"}
              </Button>
              <Button renderIcon={Save} kind="secondary" onClick={() => handleSubmit(true)} disabled={!isReady || create.isPending}>
                Save as Draft
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {drafts && drafts.length > 0 && (
            <div className="os-section">
              <div className="os-section__header">
                <h2 className="os-section__title">Drafts</h2>
              </div>
              {drafts.map((d) => (
                <DraftRow key={d.id} draft={d} />
              ))}
            </div>
          )}

          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Recently Sent</h2>
            </div>
            {sentLoading ? (
              <div style={{ padding: "1.25rem 1.5rem" }}>
                <SkeletonText width="40%" />
              </div>
            ) : sentList.length === 0 ? (
              <EmptyState title="Nothing sent yet" description="Notifications you send will appear here." />
            ) : (
              sentList.map((n) => <SentHistoryRow key={n.id} notification={n} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
