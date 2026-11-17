import { useState } from "react";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import SelectField from "@/shared/ui/SelectField";
import EntityCombobox from "@/shared/ui/EntityCombobox";
import type { RecipientRule, RecipientRuleType, SubjectAudience } from "@/features/notifications/api/notification";
import { buildRule, RULE_TYPES } from "@/features/notifications/lib/recipientRules";
import { useRecipientTargets } from "@/features/notifications/hooks/useRecipientTargets";

const TARGET_LABELS: Record<string, string> = {
  grade: "Grade",
  class: "Class",
  grade_section: "Grade section",
  subject: "Subject",
  student: "Student",
  guardian: "Guardian",
  teacher: "Teacher",
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
  const targets = useRecipientTargets();
  const [ruleType, setRuleType] = useState<RecipientRuleType>("grade");
  const [selectedId, setSelectedId] = useState("");
  const [subjectAudience, setSubjectAudience] = useState<SubjectAudience>("students");

  const availableRuleTypes = canBroadcastEveryone ? RULE_TYPES : RULE_TYPES.filter((r) => r.value !== "everyone");
  const source = ruleType === "everyone" ? null : targets[ruleType];

  const handleAdd = () => {
    if (ruleType === "everyone") {
      onAdd({ type: "everyone", label: "Everyone" });
      return;
    }
    if (!selectedId || !source) return;
    const picked = source.items.find((item) => item.id === selectedId);
    onAdd(buildRule(ruleType, selectedId, picked?.label, subjectAudience));
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

      <Button icon={<PlusOutlined />} onClick={handleAdd} disabled={disabled || (ruleType !== "everyone" && !selectedId)}>
        Add recipient
      </Button>
    </div>
  );
}
