import { Tag } from "@carbon/react";

const STREAM_TAG_TYPES = {
  science: "blue",
  commerce: "green",
  arts: "purple",
  technology: "teal",
} as const;

export default function StreamTag({ name }: { name: string }) {
  const type = STREAM_TAG_TYPES[name.trim().toLowerCase() as keyof typeof STREAM_TAG_TYPES] ?? "gray";
  return <Tag type={type} size="sm">{name}</Tag>;
}
