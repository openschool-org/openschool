import { useMemo, useState } from "react";
import { Button, TextInput, TextArea, Dropdown, Tag, InlineNotification, SkeletonText } from "@carbon/react";
import { Send, Save } from "@carbon/icons-react";
import {
  useSentNotifications,
  useDraftNotifications,
  useCreateNotification,
} from "../../queries/notifications/useNotifications";
import { CATEGORIES, PRIORITIES } from "../../services/notifications/notification";
import type {
  RecipientRule,
  NotificationCategory,
  NotificationPriority,
} from "../../services/notifications/notification";
import { getErrorMessage } from "../../lib/errorMessage";
import EmptyState from "../../components/common/EmptyState";
import { useRole } from "../../hooks/useRole";
import { useMyPosition } from "../../queries/usePositions";
import { ruleKey } from "./constants";
import RecipientPicker from "./components/RecipientPicker";
import SentHistoryRow from "./components/SentHistoryRow";
import DraftRow from "./components/DraftRow";

const ACCENT = "#406AAF";

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
                    <Tag key={ruleKey(rule)} type="teal" size="sm" filter onClose={() => removeRule(i)}>
                      {rule.label ?? rule.type}
                    </Tag>
                  ))}
                </div>
              )}
              <RecipientPicker
                onAdd={(rule) => setRules((r) => (r.some((x) => ruleKey(x) === ruleKey(rule)) ? r : [...r, rule]))}
                canBroadcastEveryone={canBroadcastEveryone}
              />
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
