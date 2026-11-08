import { Button, Modal } from "antd";

interface Props {
  open: boolean;
  title: string;
  description: React.ReactNode;
  isPending?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmEditModal({
  open,
  title,
  description,
  isPending,
  confirmLabel = "Save changes",
  onClose,
  onConfirm,
}: Props) {
  return (
    <Modal
      open={open}
      title={title}
      width={520}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" onClick={onConfirm} loading={isPending}>
            {isPending ? "Saving…" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="os-text-md">{description}</p>
    </Modal>
  );
}
