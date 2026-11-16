import { Alert, Button } from "antd";
import LinkButton from "@/shared/ui/LinkButton";

interface Props {
  onOpenTab: (tab: "guardians" | "subjects") => void;
  onClose: () => void;
}

// Shown once after adding a student, so the rest of their setup is one click away.
export default function NextStepsAlert({ onOpenTab, onClose }: Props) {
  return (
    <Alert
      type="info"
      showIcon
      closable={{ onClose }}
      className="os-mb-6"
      title="Student added. Next steps"
      description={
        <div className="os-flex os-gap-2 os-wrap os-mt-2">
          <Button onClick={() => onOpenTab("guardians")}>Add a guardian</Button>
          <LinkButton to="/classes">Enrol in a class</LinkButton>
          <Button onClick={() => onOpenTab("subjects")}>Choose subjects</Button>
        </div>
      }
    />
  );
}
