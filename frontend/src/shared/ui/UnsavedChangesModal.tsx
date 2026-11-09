import { Button, Modal } from "antd";

interface Props {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export default function UnsavedChangesModal({ open, onStay, onLeave }: Props) {
  return (
    <Modal
      open={open}
      title="Leave without saving?"
      width={520}
      onCancel={onStay}
      footer={
        <>
          <Button onClick={onStay}>Stay</Button>
          <Button type="primary" danger onClick={onLeave}>Leave without saving</Button>
        </>
      }
    >
      <p className="os-text-md">You have unsaved changes. If you leave now, they'll be lost.</p>
    </Modal>
  );
}
