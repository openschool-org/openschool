import { Button, Modal } from "antd";

interface Props {
  open: boolean;
  onStaySignedIn: () => void;
  onSignOut: () => void;
}

// Shown 60 seconds before an idle sign-out (S12) so a still-present user on
// a shared lab or staffroom PC gets a chance to stay signed in, rather than
// losing unsaved work with no warning.
export default function IdleWarningModal({ open, onStaySignedIn, onSignOut }: Props) {
  return (
    <Modal
      open={open}
      title="Still there?"
      width={520}
      onCancel={onStaySignedIn}
      mask={{ closable: false }}
      footer={
        <>
          <Button onClick={onSignOut}>Sign out now</Button>
          <Button type="primary" onClick={onStaySignedIn}>Stay signed in</Button>
        </>
      }
    >
      <p className="os-text-md">
        You&apos;ve been inactive for a while. For your security, you&apos;ll be signed out in less than a minute
        unless you choose to stay signed in.
      </p>
    </Modal>
  );
}
