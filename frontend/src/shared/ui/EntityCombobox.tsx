import { useEffect, useState } from "react";
import { ComboBox } from "@carbon/react";
import { useDebounced } from "@/shared/hooks/useDebounced";

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_CHARS = 2;

interface EntityComboboxProps<T> {
  id: string;
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  itemToString: (item: T) => string;
  getId: (item: T) => string;
  labelText?: string;
  ariaLabel?: string;
  placeholder?: string;
  invalid?: boolean;
  invalidText?: string;
  disabled?: boolean;
  // Server-search mode: typing debounces into this callback (300ms,
  // 2-character minimum; shorter input calls back with "") instead of
  // Carbon filtering `items` client-side. Pass the current search results
  // as `items`, not the full list - the parent owns the paginated/searched query.
  onSearch?: (term: string) => void;
}

// Type-to-filter picker for large people lists where a plain Select would
// not scale. Client-filters `items` by default; pass `onSearch` to drive a
// server-backed search instead (see the prop's own note).
export default function EntityCombobox<T>({
  id,
  items,
  selectedId,
  onSelect,
  itemToString,
  getId,
  labelText,
  ariaLabel,
  placeholder,
  invalid,
  invalidText,
  disabled,
  onSearch,
}: EntityComboboxProps<T>) {
  const selectedItem = items.find((item) => getId(item) === selectedId) ?? null;
  const [inputValue, setInputValue] = useState("");
  const debouncedInput = useDebounced(inputValue, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (!onSearch) return;
    const trimmed = debouncedInput.trim();
    onSearch(trimmed.length >= SEARCH_MIN_CHARS ? trimmed : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSearch is expected to be a stable callback (e.g. a setState); including it would re-run on every parent render
  }, [debouncedInput]);

  return (
    <ComboBox
      id={id}
      items={items}
      itemToString={(item) => (item ? itemToString(item as T) : "")}
      selectedItem={selectedItem}
      onChange={({ selectedItem }) => onSelect(selectedItem ? getId(selectedItem) : "")}
      onInputChange={onSearch ? setInputValue : undefined}
      shouldFilterItem={onSearch ? () => true : undefined}
      titleText={labelText}
      aria-label={labelText ? undefined : ariaLabel}
      placeholder={placeholder ?? "Search by name or ID…"}
      invalid={invalid}
      invalidText={invalidText}
      disabled={disabled}
    />
  );
}
