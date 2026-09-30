import { useState } from "react";
import { tokenFromHash } from "@/shared/lib/urlHash";
import ActivateStartForm from "@/features/activation/components/ActivateStartForm";
import ActivateCompleteForm from "@/features/activation/components/ActivateCompleteForm";

// Step one asks for the printed code; the emailed link returns here with #token= for step two.
export default function Activate() {
  const [token] = useState(tokenFromHash);
  return token ? <ActivateCompleteForm token={token} /> : <ActivateStartForm />;
}
