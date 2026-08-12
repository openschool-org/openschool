import { GUARDIAN_RELATIONSHIPS } from "../../../services/guardian";

export function relationshipLabel(value: string) {
  return GUARDIAN_RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}
