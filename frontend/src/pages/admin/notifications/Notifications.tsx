import { useState } from "react";
import {
  Button,
  RadioButtonGroup,
  RadioButton,
  Select,
  SelectItem,
  TextArea,
  Tag,
  InlineNotification,
} from "@carbon/react";
import {
  Chat,
  MessageQueue,
  Send,
  CheckmarkFilled,
  UserMultiple,
  Building,
  Education,
  User,
} from "@carbon/icons-react";

const ACCENT = "#406AAF";

type Channel = "sms" | "whatsapp";
type TargetType = "everyone" | "class" | "grade" | "specific";

const CLASSES = [
  { id: "cl-1", name: "10-A", grade: "Grade 10", count: 38 },
  { id: "cl-2", name: "10-B", grade: "Grade 10", count: 35 },
  { id: "cl-3", name: "11-A", grade: "Grade 11", count: 36 },
  { id: "cl-4", name: "11-B", grade: "Grade 11", count: 40 },
  { id: "cl-5", name: "9-A",  grade: "Grade 9",  count: 42 },
  { id: "cl-6", name: "8-A",  grade: "Grade 8",  count: 44 },
];

const GRADES = [
  { id: "g8",  label: "Grade 8",  count: 44  },
  { id: "g9",  label: "Grade 9",  count: 42  },
  { id: "g10", label: "Grade 10", count: 73  },
  { id: "g11", label: "Grade 11", count: 76  },
  { id: "g12", label: "Grade 12", count: 62  },
  { id: "g13", label: "Grade 13", count: 49  },
];

const SENT_LOG = [
  {
    id: 1,
    channel: "whatsapp" as Channel,
    target: "All parents",
    recipients: 342,
    message: "School will be closed on Friday due to a national holiday. Classes resume Monday.",
    sentAt: "Today, 10:15 AM",
  },
  {
    id: 2,
    channel: "sms" as Channel,
    target: "Grade 10-A",
    recipients: 38,
    message: "Reminder: Parent-teacher meeting tomorrow at 3:00 PM in the main hall.",
    sentAt: "Yesterday, 4:30 PM",
  },
  {
    id: 3,
    channel: "whatsapp" as Channel,
    target: "Grade 11",
    recipients: 76,
    message: "A/L mock exam results are now available. Please check the student portal.",
    sentAt: "Jun 27, 9:00 AM",
  },
];

const SMS_LIMIT = 160;

function recipientSummary(
  targetType: TargetType,
  selectedClass: string,
  selectedGrade: string,
  specificPhone: string,
): { label: string; count: number | null } {
  if (targetType === "everyone") return { label: "All parents & guardians", count: 342 };
  if (targetType === "class") {
    const cls = CLASSES.find((c) => c.id === selectedClass);
    if (!cls) return { label: "Select a class", count: null };
    return { label: `${cls.grade} — Class ${cls.name} parents`, count: cls.count };
  }
  if (targetType === "grade") {
    const gr = GRADES.find((g) => g.id === selectedGrade);
    if (!gr) return { label: "Select a grade", count: null };
    return { label: `${gr.label} parents`, count: gr.count };
  }
  if (specificPhone.trim()) return { label: specificPhone.trim(), count: 1 };
  return { label: "Enter a phone number", count: null };
}

export default function Notifications() {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [targetType, setTargetType] = useState<TargetType>("everyone");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [specificPhone, setSpecificName] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const { label: recipientLabel, count: recipientCount } = recipientSummary(
    targetType, selectedClass, selectedGrade, specificPhone,
  );

  const isReady =
    message.trim().length > 0 &&
    recipientCount !== null &&
    (targetType !== "class" || selectedClass !== "") &&
    (targetType !== "grade" || selectedGrade !== "") &&
    (targetType !== "specific" || specificPhone.trim() !== "");

  const handleSend = () => {
    setSent(true);
    setMessage("");
    setTimeout(() => setSent(false), 4000);
  };

  const charCount = message.length;
  const charWarning = channel === "sms" && charCount > SMS_LIMIT;

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Notifications</h1>
          <p className="os-page__subtitle">
            Send SMS or WhatsApp messages to parents, guardians, and staff
          </p>
        </div>
      </div>

      {sent && (
        <InlineNotification
          kind="success"
          title="Sent"
          subtitle={`Message sent to ${recipientLabel} via ${channel === "sms" ? "SMS" : "WhatsApp"}.`}
          lowContrast
          hideCloseButton
          style={{ marginBottom: "1.5rem", maxWidth: "100%" }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Compose ── */}
        <div className="os-section">
          <div className="os-section__header">
            <h2 className="os-section__title">Compose Message</h2>
          </div>
          <div className="os-section__body" style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

            {/* Channel */}
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#525252", marginBottom: "0.75rem" }}>
                Channel
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {(["sms", "whatsapp"] as Channel[]).map((ch) => {
                  const active = channel === ch;
                  return (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.625rem 1.25rem",
                        border: `1.5px solid ${active ? ACCENT : "#e0e0e0"}`,
                        background: active ? "#eef2f9" : "#ffffff",
                        color: active ? ACCENT : "#525252",
                        cursor: "pointer",
                        fontWeight: active ? 600 : 400,
                        fontSize: "0.875rem",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      {ch === "sms"
                        ? <MessageQueue size={16} />
                        : <Chat size={16} />
                      }
                      {ch === "sms" ? "SMS" : "WhatsApp"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient type */}
            <div>
              <p style={{ fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#525252", marginBottom: "0.75rem" }}>
                Send To
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                {(
                  [
                    { type: "everyone" as TargetType, label: "Everyone",      Icon: UserMultiple },
                    { type: "class"    as TargetType, label: "By Class",      Icon: Building     },
                    { type: "grade"    as TargetType, label: "By Grade",      Icon: Education    },
                    { type: "specific" as TargetType, label: "Specific",      Icon: User         },
                  ] as { type: TargetType; label: string; Icon: React.ComponentType<{ size?: number }> }[]
                ).map(({ type, label, Icon }) => {
                  const active = targetType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setTargetType(type)}
                      style={{
                        padding: "0.75rem",
                        border: `1.5px solid ${active ? ACCENT : "#e0e0e0"}`,
                        background: active ? "#eef2f9" : "#ffffff",
                        color: active ? ACCENT : "#525252",
                        cursor: "pointer",
                        textAlign: "center",
                        fontSize: "0.8125rem",
                        fontWeight: active ? 600 : 400,
                        transition: "border-color 0.15s, background 0.15s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.375rem",
                      }}
                    >
                      <Icon size={18} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional selector */}
            {targetType === "class" && (
              <Select
                id="target-class"
                labelText="Select Class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <SelectItem value="" text="Choose a class…" />
                {CLASSES.map((c) => (
                  <SelectItem key={c.id} value={c.id} text={`${c.grade} — ${c.name} (${c.count} students)`} />
                ))}
              </Select>
            )}

            {targetType === "grade" && (
              <Select
                id="target-grade"
                labelText="Select Grade"
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
              >
                <SelectItem value="" text="Choose a grade…" />
                {GRADES.map((g) => (
                  <SelectItem key={g.id} value={g.id} text={`${g.label} (${g.count} students)`} />
                ))}
              </Select>
            )}

            {targetType === "specific" && (
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem", color: "#161616" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="os-search__input"
                  style={{ width: "100%", padding: "0.625rem 0.75rem", border: "1px solid #8d8d8d", fontSize: "0.875rem", background: "#ffffff" }}
                  placeholder="e.g. 077 123 4567"
                  value={specificPhone}
                  onChange={(e) => setSpecificPhone(e.target.value)}
                />
              </div>
            )}

            {/* Message */}
            <div>
              <TextArea
                id="notification-message"
                labelText="Message"
                placeholder="Type your message here…"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.375rem" }}>
                <span style={{
                  fontSize: "0.75rem",
                  color: charWarning ? "#da1e28" : "#8d8d8d",
                  fontWeight: charWarning ? 600 : 400,
                }}>
                  {charCount}{channel === "sms" ? ` / ${SMS_LIMIT}` : ""} characters
                  {channel === "sms" && charCount > SMS_LIMIT && ` — will split into ${Math.ceil(charCount / 153)} SMS parts`}
                </span>
              </div>
            </div>

            <Button
              renderIcon={Send}
              kind="primary"
              onClick={handleSend}
              disabled={!isReady}
            >
              Send Notification
            </Button>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div>
          {/* Summary */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Preview</h2>
            </div>
            <div className="os-section__body" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f4" }}>
                <span style={{ color: "#525252" }}>Channel</span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontWeight: 500, color: "#161616" }}>
                  {channel === "sms"
                    ? <><MessageQueue size={14} /> SMS</>
                    : <><Chat size={14} style={{ fill: "#25d366" }} /> WhatsApp</>
                  }
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f4" }}>
                <span style={{ color: "#525252" }}>Recipients</span>
                <span style={{ fontWeight: 500, color: "#161616", textAlign: "right", maxWidth: "60%" }}>
                  {recipientLabel}
                </span>
              </div>
              {recipientCount !== null && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", padding: "0.4rem 0", borderBottom: "1px solid #f4f4f4" }}>
                  <span style={{ color: "#525252" }}>Estimated sends</span>
                  <span style={{ fontWeight: 600, color: ACCENT }}>{recipientCount}</span>
                </div>
              )}
              <div style={{ padding: "0.4rem 0", fontSize: "0.8125rem" }}>
                <span style={{ color: "#525252", display: "block", marginBottom: "0.375rem" }}>Message preview</span>
                <p style={{ margin: 0, color: message.trim() ? "#161616" : "#8d8d8d", fontSize: "0.8125rem", lineHeight: 1.5, fontStyle: message.trim() ? "normal" : "italic" }}>
                  {message.trim() || "Your message will appear here…"}
                </p>
              </div>
            </div>
          </div>

          {/* Recent */}
          <div className="os-section">
            <div className="os-section__header">
              <h2 className="os-section__title">Recently Sent</h2>
            </div>
            <div>
              {SENT_LOG.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "0.875rem 1.5rem",
                    borderBottom: i < SENT_LOG.length - 1 ? "1px solid #f4f4f4" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <Tag type={entry.channel === "whatsapp" ? "green" : "blue"} size="sm">
                      {entry.channel === "whatsapp" ? "WhatsApp" : "SMS"}
                    </Tag>
                    <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{entry.sentAt}</span>
                  </div>
                  <p style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", fontWeight: 500, color: "#161616" }}>
                    {entry.target}
                    <span style={{ fontWeight: 400, color: "#525252" }}> · {entry.recipients} recipients</span>
                  </p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "#525252", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
