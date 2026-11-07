import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { AutoComplete, Input } from "antd";
import type { InputRef } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { useGlobalSearch } from "@/features/system/queries/useGlobalSearch";

type GroupKey = "students" | "teachers" | "guardians" | "non_academic_staff";

const GROUPS: { key: GroupKey; label: string; route: (id: string) => string }[] = [
  { key: "students", label: "Students", route: (id) => `/students/${id}` },
  { key: "teachers", label: "Teachers", route: (id) => `/teachers/${id}` },
  { key: "guardians", label: "Guardians", route: () => "/guardians" },
  { key: "non_academic_staff", label: "Non-academic staff", route: () => "/non-academic-staff" },
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
    for (const g of GROUPS) for (const item of data?.[g.key] ?? []) map.set(item.id, g.route(item.id));
    return map;
  }, [data, matchedActions]);

  const options = useMemo(() => {
    const groups: { label: ReactNode; options: { value: string; label: ReactNode }[] }[] = [];
    if (matchedActions.length > 0) {
      groups.push({ label: "Actions", options: matchedActions.map((a) => ({ value: a.id, label: <span className="os-search-opt__name">{a.name}</span> })) });
    }
    for (const g of GROUPS) {
      const items = data?.[g.key] ?? [];
      if (items.length === 0) continue;
      groups.push({
        label: g.label,
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
  }, [data, matchedActions]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const goTo = (id: string) => {
    const route = routes.get(id);
    if (route) navigate(route);
    setQuery("");
    onClose?.();
  };

  const showPanel = debounced.trim().length >= 2;
  const emptyText = isFetching ? "Searching…" : isError ? "Search failed - please try again." : `No matches for "${debounced}"`;
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
        aria-label="Search"
        placeholder="Search or run an action…"
        prefix={<SearchOutlined />}
        suffix={query ? null : <kbd className="os-topbar-search__kbd">{shortcut}</kbd>}
        onBlur={() => onClose?.()}
        onKeyDown={(e) => e.key === "Escape" && onClose?.()}
      />
    </AutoComplete>
  );
}
