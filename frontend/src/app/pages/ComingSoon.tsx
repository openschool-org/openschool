import { ArrowLeftOutlined, RocketOutlined } from "@ant-design/icons";
import LinkButton from "@/shared/ui/LinkButton";
import StatusView from "@/shared/ui/StatusView";

interface ComingSoonProps {
  feature: string;
}

export default function ComingSoon({ feature }: ComingSoonProps) {
  return (
    <StatusView
      icon={RocketOutlined}
      badge="Under construction"
      title={`${feature} is coming soon`}
      subtitle="We're actively building this module to bring you new capabilities. Check back in an upcoming release."
      actions={
        <LinkButton to="/" type="primary" icon={<ArrowLeftOutlined />}>
          Back to Dashboard
        </LinkButton>
      }
    />
  );
}
