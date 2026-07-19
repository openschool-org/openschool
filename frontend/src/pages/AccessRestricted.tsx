import { useAsgardeo } from "@asgardeo/react";
import { Button } from "@carbon/react";

export default function AccessRestricted() {
  const { signOut } = useAsgardeo();

  return (
    <div style={{ textAlign: "center", marginTop: "4rem" }}>
      <h2>Access restricted</h2>
      <p style={{ color: "#525252", margin: "0.5rem 0 1.5rem" }}>
        Your account does not have access to this portal yet.
      </p>
      <Button kind="tertiary" onClick={() => signOut()}>
        Sign out
      </Button>
    </div>
  );
}
