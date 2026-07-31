import { useThunderID } from "@thunderid/react";
import { Button } from "@carbon/react";
import { Locked } from "@carbon/icons-react";
import StatusView from "../components/common/StatusView";

export default function AccessRestricted() {
  const { signOut } = useThunderID();

  return (
    <StatusView
      variant="fullscreen"
      icon={Locked}
      title="Access restricted"
      subtitle="Your account doesn't have access to this portal yet. If you think this is a mistake, contact your school administrator."
      actions={
        <Button kind="tertiary" onClick={() => signOut()}>
          Sign out
        </Button>
      }
    />
  );
}
