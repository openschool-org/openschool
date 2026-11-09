import { useThunderID } from "@thunderid/react";
import { Button } from "antd";
import { LockOutlined } from "@ant-design/icons";
import StatusView from "@/shared/ui/StatusView";

export default function AccessRestricted() {
  const { signOut } = useThunderID();

  return (
    <StatusView
      variant="fullscreen"
      icon={LockOutlined}
      title="Access restricted"
      subtitle="Your account doesn't have access to this portal yet. If you think this is a mistake, contact your school administrator."
      actions={<Button onClick={() => signOut()}>Sign out</Button>}
    />
  );
}
