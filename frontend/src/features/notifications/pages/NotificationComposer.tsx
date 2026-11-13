import { useRef, useState } from "react";
import { Alert, Button, Modal, Segmented, Tag } from "antd";
import { SaveOutlined, SendOutlined } from "@ant-design/icons";
import Field from "@/shared/ui/Field";
import SelectField from "@/shared/ui/SelectField";
import TextAreaField from "@/shared/ui/TextAreaField";
import TextField from "@/shared/ui/TextField";
import { MODAL_WIDTH } from "@/shared/ui/modalWidth";
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("general");
  const [priority, setPriority] = useState<NotificationPriority>("normal");
  const [rules, setRules] = useState<RecipientRule[]>([]);
  const composeSession = useRef(0);

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
    const submittedSession = composeSession.current;
    create.mutate(
      {
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        save_as_draft: saveAsDraft,
        recipient_rules: rules,
      },
      { onSuccess: () => {
        if (composeSession.current !== submittedSession) return;
        resetForm();
        setComposeOpen(false);
      } },
    );
  };

  const openComposer = () => {
    composeSession.current += 1;
    create.reset();
    setComposeOpen(true);
  };
  const closeComposer = () => {
    if (create.isPending) return;
    composeSession.current += 1;
    setComposeOpen(false);
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
        <Button type="primary" icon={<SendOutlined />} onClick={openComposer}>
          Notify
        </Button>
      </div>

      {create.isSuccess && (
        <Alert type="success" showIcon closable onClose={() => create.reset()} className="os-mb-6" title="Done" description="Notification saved." />
      )}

      <Modal
        open={composeOpen}
        title="Compose notification"
        width={MODAL_WIDTH.lg}
        onCancel={closeComposer}
        footer={
          <>
            <Button icon={<SaveOutlined />} onClick={() => handleSubmit(true)} disabled={!isReady || create.isPending}>
              Save as draft
            </Button>
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSubmit(false)} disabled={!isReady} loading={create.isPending}>
              {create.isPending ? "Sending…" : "Send now"}
            </Button>
          </>
        }
      >
        {create.isError && <Alert type="error" showIcon closable onClose={() => create.reset()} className="os-mb-4" title="Could not send notification" description={getErrorMessage(create.error)} />}
        <div className="os-flex os-col os-gap-5">
          <TextField id="notification-title" label="Title" placeholder="e.g. Term Test Timetable Released" value={title} onChange={setTitle} disabled={create.isPending} />
          <TextAreaField id="notification-message" label="Message" placeholder="Type your message here…" rows={5} value={message} onChange={setMessage} disabled={create.isPending} />

          <div className="os-modal-form">
            <SelectField
              id="notification-category"
              label="Category"
              value={category}
              onChange={(v) => setCategory(v as NotificationCategory)}
              disabled={create.isPending}
              options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            />
            <Field id="notification-priority" label="Priority">
              <Segmented
                id="notification-priority"
                value={priority}
                disabled={create.isPending}
                onChange={(v) => setPriority(v as NotificationPriority)}
                options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
              />
            </Field>
          </div>

          <div>
            <h3 className="os-text-md os-fw-500 os-mt-0 os-mb-3">Send to</h3>
            {rules.length > 0 && (
              <div className="os-flex os-wrap os-gap-1h os-mb-3">
                {rules.map((rule, i) => (
                  <Tag
                    key={ruleKey(rule)}
                    color="blue"
                    variant="filled"
                    closable={!create.isPending}
                    onClose={(e) => { e.preventDefault(); removeRule(i); }}
                  >
                    {rule.label ?? rule.type}
                  </Tag>
                ))}
              </div>
            )}
            <RecipientPicker
              onAdd={(rule) => setRules((r) => (r.some((x) => ruleKey(x) === ruleKey(rule)) ? r : [...r, rule]))}
              canBroadcastEveryone={canBroadcastEveryone}
              disabled={create.isPending}
            />
          </div>
        </div>
      </Modal>

      {drafts && drafts.length > 0 && (
        <div className="os-section os-mb-6">
          <div className="os-section__header">
            <h2 className="os-section__title">Drafts</h2>
          </div>
          {drafts.map((d) => <DraftRow key={d.id} draft={d} />)}
        </div>
      )}

      <div className="os-mt-6">
        <NotificationHistory />
      </div>
    </div>
  );
}
