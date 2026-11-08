import { useSyncExternalStore } from "react";
import { Alert, Button } from "antd";
import { useStaleData } from "@/shared/hooks/useStaleData";
import { formatTime } from "@/shared/lib/date";
import { useT } from "@/shared/i18n/useT";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

// Tells the user when the page shows cached data because the network or server failed.
export default function OfflineBanner() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  const { savedAt, retry } = useStaleData();
  const { t } = useT();

  if (online && !savedAt) return null;

  const title = online ? t("offline.couldNotRefresh") : t("offline.offline");
  const subtitle = savedAt ? t("offline.savedAt", { time: formatTime(new Date(savedAt)) }) : t("offline.noSave");

  return (
    <div className="os-offline-banner" role="status">
      <Alert
        type="warning"
        showIcon
        title={title}
        description={subtitle}
        action={<Button size="small" onClick={() => void retry()}>{t("common.retry")}</Button>}
      />
    </div>
  );
}
