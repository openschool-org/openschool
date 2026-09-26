import { Link, useNavigate } from "react-router";
import { Button } from "@carbon/react";
import { Compass, ArrowLeft, Home } from "@carbon/icons-react";
import StatusView from "@/shared/ui/StatusView";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <StatusView
      icon={Compass}
      code="404"
      badge="Page not found"
      title="Lost in space?"
      subtitle="The page you are looking for doesn't exist, has been removed, or is temporarily unavailable."
      actions={
        <>
          <Button kind="secondary" renderIcon={ArrowLeft} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button as={Link} to="/" renderIcon={Home} kind="primary">
            Back to Dashboard
          </Button>
        </>
      }
    />
  );
}
