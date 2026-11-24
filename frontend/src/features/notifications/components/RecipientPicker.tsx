import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import type { Audience, RecipientRule, RecipientRuleType, SubjectAudience } from "@/features/notifications/api/notification";
import { allowedRuleTypes, AUDIENCE_OPTIONS, buildRule, RULE_TYPES } from "@/features/notifications/lib/recipientRules";
import { useRecipientTargets } from "@/features/notifications/hooks/useRecipientTargets";
import { useNotifyScope } from "@/features/notifications/queries/useNotifications";

const TARGET_LABELS: Record<string, string> = {
  grade: "Grade",
  class: "Class",
  grade_section: "Grade section",
  subject: "Subject",
  student: "Student",
  guardian: "Guardian",
  teacher: "Teacher",
  society: "Society",
};

export default function RecipientPicker({
  onAdd,
  canBroadcastEveryone,
  disabled = false,
}: {
  onAdd: (rule: RecipientRule) => void;
  canBroadcastEveryone: boolean;
  disabled?: boolean;
}) {
  const { data: scope } = useNotifyScope();
  const targets = useRecipientTargets(scope);
  const allowed = allowedRuleTypes(scope, canBroadcastEveryone);
  const [chosenType, setRuleType] = useState<RecipientRuleType | "">("");
  const [selectedId, setSelectedId] = useState("");
  const [subjectAudience, setSubjectAudience] = useState<SubjectAudience>("students");
  const [audience, setAudience] = useState<Audience>("all");

  // Falls back to the first allowed type until the sender picks one, so a teacher never starts on "By grade".
  const ruleType: RecipientRuleType = chosenType && allowed.includes(chosenType) ? chosenType : allowed.find((t) => t !== "everyone") ?? allowed[0];
  const availableRuleTypes = RULE_TYPES.filter((r) => allowed.includes(r.value));
  const source = ruleType === "everyone" ? null : targets[ruleType];
  const audienceOptions = ruleType === "class" || ruleType === "society" ? AUDIENCE_OPTIONS[ruleType] : null;

  const handleAdd = () => {
    if (ruleType === "everyone") {
      onAdd({ type: "everyone", label: "Everyone" });
      return;
    }
    if (!selectedId || !source) return;
    const picked = source.items.find((item) => item.id === selectedId);
    onAdd(buildRule(ruleType, selectedId, picked?.label, subjectAudience, audienceOptions ? audience : undefined));
    setSelectedId("");
  };

  return (
    <div className="os-grid os-gap-3">
      <SelectField
        id="recipient-rule-type"
        label="Recipient type"
        placeholder="Choose…"
        value={ruleType}
        disabled={disabled}
        onChange={(v) => {
          setRuleType(v as RecipientRuleType);
          setSelectedId("");
          setAudience(v === "society" ? "students" : "all");
        }}
        options={availableRuleTypes.map((r) => ({ value: r.value, label: r.label }))}
      />

      {source && (
        <EntityCombobox
          key={ruleType}
          id={`rule-${ruleType.replace("_", "-")}`}
          labelText={TARGET_LABELS[ruleType]}
          items={source.items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSearch={source.onSearch}
          getId={(t) => t.id}
          itemToString={(t) => t.text}
          placeholder={`Search ${source.name}…`}
          disabled={disabled}
        />
      )}
      {ruleType === "subject" && (
        <SelectField
          id="rule-subject-audience"
          label="Audience"
          value={subjectAudience}
          onChange={(v) => setSubjectAudience(v as SubjectAudience)}
          disabled={disabled}
          options={[{ value: "students", label: "Students taking this subject" }, { value: "teachers", label: "Teachers of this subject" }]}
        />
      )}

      {audienceOptions && (
        <SelectField
          id="rule-audience"
          label="Audience"
          value={audience}
          onChange={(v) => setAudience(v as Audience)}
          disabled={disabled}
          options={audienceOptions}
        />
      )}

      <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={disabled || (ruleType !== "everyone" && !selectedId)}>
        Add recipient
      </Button>
    </div>
  );
}
