import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Rocket, ArrowLeft } from "@carbon/icons-react";
import StatusView from "@/shared/ui/StatusView";

interface ComingSoonProps {
  feature: string;
}

export default function ComingSoon({ feature }: ComingSoonProps) {
  return (
    <StatusView
      icon={Rocket}
      badge="Under construction"
      title={`${feature} is coming soon`}
      subtitle="We're actively building this module to bring you new capabilities. Check back in an upcoming release."
      actions={
        <Button as={Link} to="/" renderIcon={ArrowLeft} kind="primary">
          Back to Dashboard
        </Button>
      }
    />
  );
}
