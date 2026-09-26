import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Search } from "@carbon/icons-react";
import { useDebounced } from "@/shared/hooks/useDebounced";
import { useGlobalSearch } from "@/features/system/queries/useGlobalSearch";
import type { SearchResultItem } from "@/features/system/api/search";

type GroupKey = "students" | "teachers" | "guardians" | "non_academic_staff";

interface FlatResult extends SearchResultItem {
  group: string;
  route: string;
}

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
  const [open, setOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounced = useDebounced(query, 300);
  const { data, isFetching, isError } = useGlobalSearch(debounced);

  const matchedActions = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return [];
    return ACTIONS.filter((a) => a.name.toLowerCase().includes(q));
  }, [debounced]);

  const flat: FlatResult[] = useMemo(
    () => [
      ...matchedActions.map((a) => ({ id: a.id, name: a.name, subtitle: "", group: "Actions", route: a.route })),
      ...GROUPS.flatMap((g) =>
        (data?.[g.key] ?? []).map((item) => ({ ...item, group: g.label, route: g.route(item.id) }))
      ),
    ],
    [data, matchedActions]
  );

  const highlightedIndex = highlightedId ? flat.findIndex((f) => f.id === highlightedId) : -1;
  const activeIndex = highlightedIndex >= 0 ? highlightedIndex : 0;

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    };

    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [onClose]);

  const goTo = (item: FlatResult) => {
    navigate(item.route);
    setQuery("");
    setOpen(false);
    onClose?.();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || flat.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedId(flat[(activeIndex + 1) % flat.length].id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedId(flat[(activeIndex - 1 + flat.length) % flat.length].id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      goTo(flat[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
      onClose?.();
    }
  };

  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div ref={containerRef} className="os-relative os-w-20 os-mx-4 os-self-center">
      <div className="os-search os-max-w-full os-flex os-items-center">
        <Search size={16} className="os-search__icon" />
        <input
          ref={inputRef}
          className="os-search__input"
          placeholder="Search or run an action…"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        <kbd className="os-search-kbd os-absolute os-right-2 os-text-xs os-fw-600 os-py-h os-px-1h os-rounded-md os-pointer-events-none os-select-none"
        >
          {typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent) ? "⌘K" : "Ctrl+K"}
        </kbd>
      </div>

      {showPanel && (
        <div className="os-search-popover os-absolute os-inset-x-0 os-bg-layer os-border os-rounded-sm os-shadow-md os-overflow-y-auto os-z-popover"
        >
          {isFetching && flat.length === 0 && (
            <div className="os-py-3 os-px-4 os-text-sm os-c-tertiary">Searching…</div>
          )}
          {!isFetching && isError && (
            <div className="os-py-3 os-px-4 os-text-sm os-c-danger">
              Search failed - please try again.
            </div>
          )}
          {!isFetching && !isError && flat.length === 0 && (
            <div className="os-py-3 os-px-4 os-text-sm os-c-tertiary">
              No matches for &quot;{debounced}&quot;
            </div>
          )}
          {matchedActions.length > 0 && (
            <div>
              <div className="os-pt-2 os-px-4 os-pb-1 os-text-2xs os-fw-600 os-tracking os-uppercase os-c-tertiary">
                Actions
              </div>
              {matchedActions.map((action) => {
                const isHighlighted = action.id === flat[activeIndex]?.id;
                return (
                  <button
                    key={action.id}
                    onMouseEnter={() => setHighlightedId(action.id)}
                    onClick={() => goTo({ id: action.id, name: action.name, subtitle: "", group: "Actions", route: action.route })} className={`os-block os-w-full os-text-left os-py-2 os-px-4 os-border-none ${isHighlighted ? "os-bg-accent-light" : "os-bg-transparent"} os-pointer`}
                  >
                    <div className="os-fw-600 os-text-md os-c-primary">{action.name}</div>
                  </button>
                );
              })}
            </div>
          )}
          {GROUPS.map((g) => {
            const items = data?.[g.key] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={g.key}>
                <div className="os-pt-2 os-px-4 os-pb-1 os-text-2xs os-fw-600 os-tracking os-uppercase os-c-tertiary"
                >
                  {g.label}
                </div>
                {items.map((item) => {
                  const isHighlighted = item.id === flat[activeIndex]?.id;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setHighlightedId(item.id)}
                      onClick={() => goTo({ ...item, group: g.label, route: g.route(item.id) })} className={`os-block os-w-full os-text-left os-py-2 os-px-4 os-border-none ${isHighlighted ? "os-bg-accent-light" : "os-bg-transparent"} os-pointer`}
                    >
                      <div className="os-fw-600 os-text-md os-c-primary">{item.name}</div>
                      <div className="os-text-xs os-c-tertiary">{item.subtitle}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
