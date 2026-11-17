import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { AutoComplete, Input } from "antd";
import type { InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { useGlobalSearch } from "@/features/system/queries/useGlobalSearch";
import { useT } from "@/shared/i18n/useT";
import type { MessageKey } from "@/shared/i18n/messages/en";

type GroupKey = "students" | "teachers" | "guardians" | "non_academic_staff";

// Guardians and staff have no page of their own; their list filters by ?query= and opens the drawer from ?open=.
const GROUPS: { key: GroupKey; labelKey: MessageKey; route: (id: string, name: string) => string }[] = [
  { key: "students", labelKey: "search.students", route: (id) => `/students/${id}` },
  { key: "teachers", labelKey: "search.teachers", route: (id) => `/teachers/${id}` },
  { key: "guardians", labelKey: "search.guardians", route: (id, name) => `/guardians?${new URLSearchParams({ query: name, open: id })}` },
  { key: "non_academic_staff", labelKey: "search.staff", route: (id, name) => `/non-academic-staff?${new URLSearchParams({ query: name, open: id })}` },
];

const ACTIONS: { id: string; name: string; route: string }[] = [
  { id: "action-add-student", name: "Add student", route: "/students/new" },
  { id: "action-add-teacher", name: "Add teacher", route: "/teachers/new" },
  { id: "action-mark-attendance", name: "Mark attendance", route: "/attendance" },
  { id: "action-new-timetable", name: "New timetable draft", route: "/timetables" },
  { id: "action-generate-timetable", name: "Generate timetable", route: "/timetables/generate" },
  { id: "action-send-notification", name: "Send notification", route: "/notifications" },
  { id: "action-promotion", name: "Promote students", route: "/promotion" },
  { id: "action-reports", name: "Reports", route: "/reports" },
  { id: "action-analytics", name: "Analytics", route: "/analytics" },
  { id: "action-settings", name: "Settings", route: "/settings" },
];

interface Props {
  autoFocus?: boolean;
  onClose?: () => void;
}

export default function GlobalSearch({ autoFocus, onClose }: Props) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const inputRef = useRef<InputRef>(null);
  const navigate = useNavigate();
  const debounced = useDebounced(query, 300);
  const { data, isFetching, isError } = useGlobalSearch(debounced);

  const matchedActions = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    return ACTIONS.filter((a) => a.name.toLowerCase().includes(q));
  }, [debounced]);

  // value -> destination, so a selected option can be resolved without searching the lists again.
  const routes = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of matchedActions) map.set(a.id, a.route);
    for (const g of GROUPS) for (const item of data?.[g.key] ?? []) map.set(item.id, g.route(item.id, item.name));
    return map;
  }, [data, matchedActions]);

  const options = useMemo(() => {
    const groups: { label: ReactNode; options: { value: string; label: ReactNode }[] }[] = [];
    if (matchedActions.length > 0) {
      groups.push({ label: t("search.actions"), options: matchedActions.map((a) => ({ value: a.id, label: <span className="os-search-opt__name">{a.name}</span> })) });
    }
    for (const g of GROUPS) {
      const items = data?.[g.key] ?? [];
      if (items.length === 0) continue;
      groups.push({
        label: t(g.labelKey),
        options: items.map((item) => ({
          value: item.id,
          label: (
            <span className="os-search-opt">
              <span className="os-search-opt__name">{item.name}</span>
              {item.subtitle && <span className="os-search-opt__sub">{item.subtitle}</span>}
            </span>
          ),
        })),
      });
    }
    return groups;
  }, [data, matchedActions, t]);

  const goTo = (id: string) => {
    const route = routes.get(id);
    if (route) navigate(route);
    setQuery("");
    onClose?.();
  };

  const showPanel = debounced.trim().length >= 2;
  const emptyText = isFetching ? t("search.searching") : isError ? t("search.failed") : t("search.noMatches", { query: debounced });
  const shortcut = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl+K";

  return (
    <AutoComplete
      className="os-topbar-search"
      options={options}
      value={query}
      onChange={setQuery}
      onSelect={goTo}
      filterOption={false}
      open={showPanel ? undefined : false}
      notFoundContent={emptyText}
      popupMatchSelectWidth={360}
      placement="bottomRight"
    >
      <Input
        ref={inputRef}
        autoFocus={autoFocus}
        allowClear
        aria-label={t("shell.search")}
        placeholder={t("search.placeholder")}
        prefix={<SearchOutlined />}
        suffix={query ? null : <kbd className="os-topbar-search__kbd">{shortcut}</kbd>}
        onBlur={() => onClose?.()}
        onKeyDown={(e) => e.key === "Escape" && onClose?.()}
      />
    </AutoComplete>
  );
}
