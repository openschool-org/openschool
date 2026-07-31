import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Rocket } from "@carbon/icons-react";
import StatusView from "../components/common/StatusView";

interface ComingSoonProps {
  feature: string;
}

export default function ComingSoon({ feature }: ComingSoonProps) {
  return (
    <StatusView
      icon={Rocket}
      title={`${feature} is coming soon`}
      subtitle="We're still building this out. Check back in a future update."
      actions={
        <Button as={Link} to="/">
          Back to Dashboard
        </Button>
      }
    />
  );
}
