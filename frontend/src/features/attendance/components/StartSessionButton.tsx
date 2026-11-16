import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { Button } from "antd";
import type { ButtonProps } from "antd";
import { ScheduleOutlined } from "@ant-design/icons";
import { useCreateSession } from "@/features/attendance/queries/useAttendance";
import { todayISODate } from "@/shared/lib/date";
import { getErrorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/ui/toast/useToast";

interface Props {
  classId: string;
  children: ReactNode;
  type?: ButtonProps["type"];
  size?: ButtonProps["size"];
}

// Opens today's attendance session for one class and goes straight to marking.
export default function StartSessionButton({ classId, children, type = "primary", size }: Props) {
  const navigate = useNavigate();
  const createSession = useCreateSession();
  const { showToast } = useToast();

  const start = () =>
    createSession.mutate(
      { class_id: classId, date: todayISODate() },
      {
        onSuccess: (session) => navigate(`/attendance/sessions/${session.id}/mark`),
        onError: (err) => showToast({ kind: "error", title: "Could not start attendance", subtitle: getErrorMessage(err) }),
      },
    );

  return (
    <Button type={type} size={size} icon={<ScheduleOutlined />} loading={createSession.isPending} onClick={start}>
      {children}
    </Button>
  );
}
