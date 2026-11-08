import { useEffect, useState } from "react";
import { Select } from "antd";
import { useDebounced } from "@/shared/hooks/useDebounced";
import Field from "@/shared/ui/Field";

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
  // filtering `items` client-side. Pass the current search results
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

  // Picking an item fills the input with its label; searching for that label would find nothing and drop the pick.
  const handleInput = (value: string) => {
    if (!items.some((item) => itemToString(item) === value)) setInputValue(value);
  };

  const options = items.map((item) => ({ value: getId(item), label: itemToString(item) }));

  return (
    <Field id={id} label={labelText} error={invalid ? invalidText : undefined}>
      <Select
        id={id}
        className="os-w-full"
        allowClear
        options={options}
        value={selectedItem ? selectedId : undefined}
        onChange={(value?: string) => onSelect(value ?? "")}
        showSearch={onSearch
          ? { filterOption: false, onSearch: handleInput }
          : { filterOption: (input, option) => String(option?.label ?? "").toLocaleLowerCase().includes(input.trim().toLocaleLowerCase()) }}
        aria-label={labelText ? undefined : ariaLabel}
        placeholder={placeholder ?? "Search by name or ID…"}
        status={invalid ? "error" : undefined}
        disabled={disabled}
        notFoundContent={onSearch && inputValue.trim().length < SEARCH_MIN_CHARS ? "Type at least 2 characters" : "No matches"}
      />
    </Field>
  );
}
