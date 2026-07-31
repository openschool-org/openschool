import { Link } from "react-router";
import { Button } from "@carbon/react";
import { Compass } from "@carbon/icons-react";
import StatusView from "../components/common/StatusView";

export default function NotFound() {
  return (
    <StatusView
      icon={Compass}
      title="Page not found"
      subtitle="The page you're looking for doesn't exist, or may have been moved."
      actions={
        <Button as={Link} to="/">
          Back to Dashboard
        </Button>
      }
    />
  );
}
