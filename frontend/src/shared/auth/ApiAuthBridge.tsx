import { useEffect } from "react";
import { useThunderID } from "@thunderid/react";
import { useNavigate } from "react-router";
import { clearOffline } from "@/shared/lib/offlineCache";
import { setAccessTokenProvider, setUnauthorizedHandler } from "@/shared/api/client";

// Wires the ThunderID session into the axios client. Mount once, inside both providers.
export default function ApiAuthBridge() {
  const { getAccessToken, signOut, isSignedIn } = useThunderID();
  const navigate = useNavigate();

  useEffect(() => {
    setAccessTokenProvider(getAccessToken);
  }, [getAccessToken]);

  useEffect(() => {
    if (!isSignedIn) {
      setUnauthorizedHandler(null);
      return;
    }
    setUnauthorizedHandler(() => {
      clearOffline();
      Promise.resolve(signOut()).finally(() => navigate("/signin", { replace: true }));
    });
    return () => setUnauthorizedHandler(null);
  }, [isSignedIn, signOut, navigate]);

  return null;
}
