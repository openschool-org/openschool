import { Tag } from "antd";

const STREAM_TAG_COLORS = {
  science: "blue",
  commerce: "green",
  arts: "purple",
  technology: "cyan",
} as const;

export default function StreamTag({ name }: { name: string }) {
  const color = STREAM_TAG_COLORS[name.trim().toLowerCase() as keyof typeof STREAM_TAG_COLORS];
  return <Tag color={color} variant="filled">{name}</Tag>;
}
