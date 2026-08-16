import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router";
import { Search } from "@carbon/icons-react";
import { useDebounced } from "../../hooks/useDebounced";
import { useGlobalSearch } from "../../queries/useGlobalSearch";
import type { SearchResultItem } from "../../services/search";

type GroupKey = "students" | "teachers" | "guardians" | "non_academic_staff";

interface FlatResult extends SearchResultItem {
  group: string;
  route: string;
}

// Guardians and Non-academic Staff don't have per-record detail routes yet
// (their pages select a record via in-page state, not a URL param) — land
// on the directory itself rather than a dead link until that changes.
const GROUPS: { key: GroupKey; label: string; route: (id: string) => string }[] = [
  { key: "students", label: "Students", route: (id) => `/students/${id}` },
  { key: "teachers", label: "Teachers", route: (id) => `/teachers/${id}` },
  { key: "guardians", label: "Guardians", route: () => "/guardians" },
  { key: "non_academic_staff", label: "Non-Academic Staff", route: () => "/non-academic-staff" },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Keyed by result id rather than index, so it naturally "resets" to the
  // first row whenever the search term changes the result set — no effect
  // needed to reset it back to 0 on every keystroke.
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounced = useDebounced(query, 300);
  const { data, isFetching } = useGlobalSearch(debounced);

  const flat: FlatResult[] = useMemo(
    () =>
      GROUPS.flatMap((g) =>
        (data?.[g.key] ?? []).map((item) => ({ ...item, group: g.label, route: g.route(item.id) }))
      ),
    [data]
  );

  const highlightedIndex = highlightedId ? flat.findIndex((f) => f.id === highlightedId) : -1;
  const activeIndex = highlightedIndex >= 0 ? highlightedIndex : 0;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const goTo = (item: FlatResult) => {
    navigate(item.route);
    setQuery("");
    setOpen(false);
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
    }
  };

  const showPanel = open && debounced.trim().length >= 2;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "20rem", margin: "0 1rem", alignSelf: "center" }}>
      <div className="os-search" style={{ maxWidth: "100%" }}>
        <Search size={16} className="os-search__icon" />
        <input
          className="os-search__input"
          placeholder="Search students, teachers, guardians, staff…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {showPanel && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 0.25rem)",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #e0e0e0",
            borderRadius: "2px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            maxHeight: "22rem",
            overflowY: "auto",
            zIndex: 8000,
          }}
        >
          {isFetching && flat.length === 0 && (
            <div style={{ padding: "0.75rem 1rem", fontSize: "0.8125rem", color: "#8d8d8d" }}>Searching…</div>
          )}
          {!isFetching && flat.length === 0 && (
            <div style={{ padding: "0.75rem 1rem", fontSize: "0.8125rem", color: "#8d8d8d" }}>
              No matches for &quot;{debounced}&quot;
            </div>
          )}
          {GROUPS.map((g) => {
            const items = data?.[g.key] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={g.key}>
                <div
                  style={{
                    padding: "0.5rem 1rem 0.25rem",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#8d8d8d",
                  }}
                >
                  {g.label}
                </div>
                {items.map((item) => {
                  const isHighlighted = item.id === flat[activeIndex]?.id;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setHighlightedId(item.id)}
                      onClick={() => goTo({ ...item, group: g.label, route: g.route(item.id) })}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.5rem 1rem",
                        border: "none",
                        background: isHighlighted ? "#edf5ff" : "transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>{item.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>{item.subtitle}</div>
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
