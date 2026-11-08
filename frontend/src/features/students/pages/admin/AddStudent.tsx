import { Alert, Button, Card, Col, Form, Input, Radio, Row, Typography } from "antd";
import { ArrowLeftOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router";
import { useCreateStudent } from "@/features/students/queries/useStudents";
import { getErrorMessage } from "@/shared/api/errors";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone, PHONE_INVALID_TEXT } from "@/shared/lib/phone";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import LinkButton from "@/shared/ui/LinkButton";
import PersonNameItems from "@/shared/ui/PersonNameItems";

interface Values {
  full_name: string;
  name_with_initials?: string;
  calling_name?: string;
  email: string;
  phone?: string;
  index_number: string;
  whatsapp?: string;
  gender?: "male" | "female";
  address?: string;
  special_remarks?: string;
}

// Phone fields are optional; when filled they must be a valid Sri Lankan number.
const phoneRule = {
  validator: (_: unknown, value?: string) =>
    isValidSriLankanPhone(value ?? "") ? Promise.resolve() : Promise.reject(new Error(PHONE_INVALID_TEXT)),
};

const clean = (value?: string) => value?.trim() || undefined;

export default function AddStudent() {
  usePageTitle("Enrol student");
  const navigate = useNavigate();
  const createStudent = useCreateStudent();
  const [form] = Form.useForm<Values>();

  const handleFinish = (v: Values) =>
    createStudent.mutate(
      {
        full_name: v.full_name.trim(),
        name_with_initials: clean(v.name_with_initials),
        calling_name: clean(v.calling_name),
        email: v.email.trim(),
        phone_number: clean(v.phone),
        index_number: v.index_number.trim(),
        address: clean(v.address),
        whatsapp: clean(v.whatsapp),
        special_remarks: clean(v.special_remarks),
        gender: v.gender,
      },
      { onSuccess: () => navigate("/students") },
    );

  return (
    <div className="os-page">
      <div className="os-page__header">
        <div className="os-page__header-left">
          <h1 className="os-page__title">Enrol new student</h1>
          <p className="os-page__subtitle">Create a student account and profile</p>
        </div>
        <LinkButton to="/students" type="text" icon={<ArrowLeftOutlined />}>Back</LinkButton>
      </div>

      <Typography.Paragraph type="secondary" className="os-note">
        <InfoCircleOutlined />
        <span><Typography.Text strong>Initial password:</Typography.Text> the student's index number. They'll be asked to change it on first sign-in.</span>
      </Typography.Paragraph>
      {createStudent.isError && (
        <Alert type="error" showIcon className="os-mb-6" title="Error" description={getErrorMessage(createStudent.error, "Failed to enrol student")} />
      )}

      <Form form={form} layout="vertical" requiredMark={false} validateTrigger="onBlur" onFinish={handleFinish}>
        <Row gutter={24} className="os-form-columns">
          <Col xs={24} lg={12}>
          <Card className="os-form-card" title="Account">
            <Row gutter={24}>
              <PersonNameItems form={form} />
              <Col span={24}>
                <Form.Item
                  name="email"
                  label="Email address"
                  rules={[{ validator: (_, v?: string) => (EMAIL_RE.test((v ?? "").trim()) ? Promise.resolve() : Promise.reject(new Error("Enter a valid email address."))) }]}
                >
                  <Input size="large" placeholder="e.g. student@school.lk" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="phone" label="Phone (optional)" rules={[phoneRule]}>
                  <Input size="large" placeholder="e.g. 077 123 4567" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
          </Col>

          <Col xs={24} lg={12}>
          <Card className="os-form-card" title="Student profile">
            <Row gutter={24}>
              <Col span={24}>
                <Form.Item
                  name="index_number"
                  label="Index number"
                  rules={[{ required: true, whitespace: true, message: "Index number is required." }]}
                >
                  <Input size="large" placeholder="e.g. 2026/0145" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="whatsapp" label="WhatsApp (optional)" rules={[phoneRule]}>
                  <Input size="large" placeholder="e.g. 077 123 4567" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="gender" label="Gender (optional)">
                  <Radio.Group>
                    <Radio value="male">Male</Radio>
                    <Radio value="female">Female</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="address" label="Address (optional)">
                  <Input size="large" placeholder="e.g. 23, Kandy Road, Kelaniya" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="special_remarks" label="Special remarks (optional)">
                  <Input.TextArea rows={3} placeholder="Any notes about the student" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
          </Col>
        </Row>

        <div className="os-form-actions">
          <Button size="large" type="primary" htmlType="submit" loading={createStudent.isPending}>Save and enrol</Button>
          <LinkButton to="/students" size="large">Cancel</LinkButton>
        </div>
      </Form>
    </div>
  );
}
