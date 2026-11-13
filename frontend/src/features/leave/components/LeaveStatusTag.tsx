import { Tag } from "antd";
import type { LeaveStatus } from "@/features/leave/api/leave";
import { LEAVE_STATUS_TAGS } from "@/features/leave/constants";

export default function LeaveStatusTag({ status }: { status: LeaveStatus }) {
  const tag = LEAVE_STATUS_TAGS[status];
  return <Tag color={tag.color} variant="filled">{tag.label}</Tag>;
}
