import { Tag } from "antd";

const MEDIUM_TAG_COLORS = {
  sinhala: "blue",
  tamil: "purple",
  english: "cyan",
} as const;

export default function MediumTag({ name }: { name: string }) {
  const color = MEDIUM_TAG_COLORS[name.trim().toLowerCase() as keyof typeof MEDIUM_TAG_COLORS];
  return <Tag color={color} variant="filled">{name}</Tag>;
}
