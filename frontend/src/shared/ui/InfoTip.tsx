import type { ReactNode } from "react";
import { Toggletip, ToggletipButton, ToggletipContent } from "@carbon/react";
import { Information } from "@carbon/icons-react";

interface Props {
  children: ReactNode;
  label?: string;
}

// Keeps long explanations out of the layout; the short line stays visible.
export default function InfoTip({ children, label = "More information" }: Props) {
  return (
    <Toggletip align="bottom" className="os-infotip">
      <ToggletipButton label={label}>
        <Information size={16} />
      </ToggletipButton>
      <ToggletipContent>
        <p>{children}</p>
      </ToggletipContent>
    </Toggletip>
  );
}
