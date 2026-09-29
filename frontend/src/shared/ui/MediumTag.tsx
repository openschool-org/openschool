import { Tag } from "@carbon/react";

const MEDIUM_TAG_TYPES = {
  sinhala: "blue",
  tamil: "purple",
  english: "teal",
} as const;

export default function MediumTag({ name }: { name: string }) {
  const type = MEDIUM_TAG_TYPES[name.trim().toLowerCase() as keyof typeof MEDIUM_TAG_TYPES] ?? "gray";
  return <Tag type={type} size="sm">{name}</Tag>;
}
