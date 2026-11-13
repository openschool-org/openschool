import { Col, Row } from "antd";
import ActivationSettingsCard from "@/features/activation/components/ActivationSettingsCard";
import GenerateCodesCard from "@/features/activation/components/GenerateCodesCard";
import ActivationBatches from "@/features/activation/components/ActivationBatches";

// Settings > Account activation: the switches and code generation side by side, issued batches below.
export default function ActivationTab() {
  return (
    <div className="os-stack os-gap-6">
      <Row gutter={[24, 24]} className="os-form-columns">
        <Col xs={24} xl={12}><ActivationSettingsCard /></Col>
        <Col xs={24} xl={12}><GenerateCodesCard /></Col>
      </Row>
      <ActivationBatches />
    </div>
  );
}
