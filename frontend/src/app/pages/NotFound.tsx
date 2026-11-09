import { useNavigate } from "react-router";
import { Button } from "antd";
import { ArrowLeftOutlined, CompassOutlined, HomeOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import StatusView from "@/shared/ui/StatusView";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <StatusView
      icon={CompassOutlined}
      code="404"
      badge="Page not found"
      title="Lost in space?"
      subtitle="The page you are looking for doesn't exist, has been removed, or is temporarily unavailable."
      actions={
        <>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Go back
          </Button>
          <LinkButton to="/" type="primary" icon={<HomeOutlined />}>
            Back to Dashboard
          </LinkButton>
        </>
      }
    />
  );
}
