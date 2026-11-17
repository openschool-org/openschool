import { useState } from "react";
import { useSearchParams } from "react-router";

// Selected row for a list page's detail drawer. A link with ?open=<id> (from global search)
// selects that row; closing drops the param so the same link opens it again.
export function useOpenParam() {
  const [params, setParams] = useSearchParams();
  const openParam = params.get("open");
  const [selectedId, setSelectedId] = useState<string | null>(openParam);
  const [seen, setSeen] = useState(openParam);
  if (openParam !== seen) {
    setSeen(openParam);
    if (openParam) setSelectedId(openParam);
  }

  const close = () => {
    setSelectedId(null);
    if (!openParam) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("open");
        return next;
      },
      { replace: true },
    );
  };

  return { selectedId, select: setSelectedId, close };
}
