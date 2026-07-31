import { ComboBox } from "@carbon/react";

interface EntityComboboxProps<T> {
  id: string;
  items: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  itemToString: (item: T) => string;
  getId: (item: T) => string;
  labelText?: string;
  placeholder?: string;
  invalid?: boolean;
  invalidText?: string;
  disabled?: boolean;
}

// Type-to-filter picker for Student/Teacher/Guardian lists — plain <Select>
// dropdowns don't scale once there are dozens (or hundreds) of them, so
// every place in the app that picks one of these three uses this instead,
// searchable by whatever itemToString shows (name + index/employee number,
// or name + phone for guardians).
export default function EntityCombobox<T>({
  id,
  items,
  selectedId,
  onSelect,
  itemToString,
  getId,
  labelText,
  placeholder,
  invalid,
  invalidText,
  disabled,
}: EntityComboboxProps<T>) {
  const selectedItem = items.find((item) => getId(item) === selectedId) ?? null;

  return (
    <ComboBox
      id={id}
      items={items}
      itemToString={(item) => (item ? itemToString(item as T) : "")}
      selectedItem={selectedItem}
      onChange={({ selectedItem }) => onSelect(selectedItem ? getId(selectedItem) : "")}
      titleText={labelText}
      placeholder={placeholder ?? "Search by name or ID…"}
      invalid={invalid}
      invalidText={invalidText}
      disabled={disabled}
    />
  );
}
