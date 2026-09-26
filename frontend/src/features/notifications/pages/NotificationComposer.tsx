import { useState } from "react";
import { Button, TextInput, TextArea, Dropdown, Tag, InlineNotification } from "@carbon/react";
import { Send, Save } from "@carbon/icons-react";
import {
  useDraftNotifications,
  useCreateNotification,
} from "@/features/notifications/queries/useNotifications";
import { CATEGORIES, PRIORITIES } from "@/features/notifications/api/notification";
import type {
  RecipientRule,
  NotificationCategory,
  NotificationPriority,
} from "@/features/notifications/api/notification";
import { getErrorMessage } from "@/shared/api/errors";
import { useRole } from "@/shared/auth/useRole";
import { useMyPosition } from "@/features/positions/queries/usePositions";
import { ruleKey } from "@/features/notifications/constants";
import RecipientPicker from "@/features/notifications/components/RecipientPicker";
import NotificationHistory from "@/features/notifications/components/NotificationHistory";
import DraftRow from "@/features/notifications/components/DraftRow";

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

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Notifications</h1>
          <p className="os-page__subtitle">
            Send announcements to grades, classes, subjects or people.
            {role === "teacher" && myPosition && myPosition.rank_label !== "Teacher" && (
              <> Sending as <strong>{myPosition.rank_label}</strong>{canBroadcastEveryone ? ", whole school." : "."}</>
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
          onClose={() => create.reset()} className="os-mb-6 os-max-w-full"
        />
      )}
      {create.isSuccess && (
        <InlineNotification
          kind="success"
          title="Done"
          subtitle="Notification saved."
          lowContrast
          onClose={() => create.reset()} className="os-mb-6 os-max-w-full"
        />
      )}

      <div className="os-grid os-grid-cols-2-1 os-gap-6 os-items-grid-start">
        {/* Compose */}
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Compose</h2>
          </div>
          <div className="os-section__body os-flex os-col os-gap-6">
            <TextInput id="notification-title" labelText="Title" placeholder="e.g. Term Test Timetable Released" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextArea id="notification-message" labelText="Message" placeholder="Type your message here…" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />

            <div className="os-grid os-grid-cols-2 os-gap-4">
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
                <p className="os-text-xs os-fw-600 os-mb-2 os-c-secondary">Priority</p>
                <div className="os-flex os-gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)} className={`os-pill${priority === p.value ? " is-active" : ""}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="os-text-xs os-fw-600 os-tracking-wide os-uppercase os-c-secondary os-mb-3">
                Send To
              </p>
              {rules.length > 0 && (
                <div className="os-flex os-wrap os-gap-1h os-mb-3">
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

            <div className="os-flex os-gap-3">
              <Button renderIcon={Send} kind="primary" onClick={() => handleSubmit(false)} disabled={!isReady || create.isPending}>
                {create.isPending ? "Sending…" : "Send now"}
              </Button>
              <Button renderIcon={Save} kind="secondary" onClick={() => handleSubmit(true)} disabled={!isReady || create.isPending}>
                Save as draft
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

        </div>
      </div>

      <div className="os-mt-6">
        <NotificationHistory />
      </div>
    </div>
  );
}
