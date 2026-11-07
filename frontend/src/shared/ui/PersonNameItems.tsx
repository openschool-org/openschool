import { useRef } from "react";
import type { ChangeEvent } from "react";
import { Col, Form, Input } from "antd";
import type { FormInstance } from "antd";
import { suggestNameWithInitials } from "@/shared/lib/name";

// Ant Design form items for the three Sri Lankan name fields; expects field names
// full_name / name_with_initials / calling_name on the surrounding <Form>. The name with
// initials follows the full name until someone edits it, so it is only typed for names the rule gets wrong.
export default function PersonNameItems({ form }: { form: FormInstance }) {
  const previousFull = useRef("");

  const onFullNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const full = e.target.value;
    const current: string = form.getFieldValue("name_with_initials") ?? "";
    const following = !current || current === suggestNameWithInitials(previousFull.current);
    if (following) form.setFieldValue("name_with_initials", suggestNameWithInitials(full));
    previousFull.current = full;
  };

  return (
    <>
      <Col span={24}>
        <Form.Item
          name="full_name"
          label="Full name"
          extra="As on the birth certificate or NIC, e.g. Hettiwatta Arachchige Hasitha Erandika Wickramasinghe."
          rules={[{ required: true, whitespace: true, message: "Full name is required." }]}
        >
          <Input size="large" onChange={onFullNameChange} />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name="name_with_initials"
          label="Name with initials"
          extra="Filled in from the full name. Change it if needed, e.g. for Tamil or Muslim names."
        >
          <Input size="large" placeholder="H.A.H.E. Wickramasinghe" />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item name="calling_name" label="Calling name (optional)" extra="What they are usually called day to day, e.g. by teachers.">
          <Input size="large" placeholder="Hasitha" />
        </Form.Item>
      </Col>
    </>
  );
}
