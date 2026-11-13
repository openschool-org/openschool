import { Col, Row } from "antd";
import EmailStatusCard from "@/features/email/components/EmailStatusCard";
import EmailPreviewCard from "@/features/email/components/EmailPreviewCard";

// Settings > Email: how mail is delivered on the left, each template's preview on the right.
export default function EmailTab() {
  return (
    <Row gutter={[24, 24]} className="os-form-columns">
      <Col xs={24} lg={9}><EmailStatusCard /></Col>
      <Col xs={24} lg={15}><EmailPreviewCard /></Col>
    </Row>
  );
}
