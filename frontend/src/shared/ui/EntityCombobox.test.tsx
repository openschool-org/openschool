import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import EntityCombobox from "@/shared/ui/EntityCombobox";

// jsdom has no scrollIntoView, which Carbon calls on the highlighted item.
Element.prototype.scrollIntoView = () => {};

const teachers = [{ id: "t1", name: "H.A. Perera", no: "EMP001" }];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EntityCombobox server search", () => {
  const setup = () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(
      <EntityCombobox id="t" labelText="Teacher" items={teachers} selectedId="" onSelect={() => {}} onSearch={onSearch}
        getId={(t) => t.id} itemToString={(t) => `${t.name} - ${t.no}`} />,
    );
    const type = (value: string) => {
      fireEvent.change(screen.getByRole("combobox"), { target: { value } });
      act(() => vi.advanceTimersByTime(400));
    };
    return { onSearch, type };
  };

  it("searches for typed text", () => {
    const { onSearch, type } = setup();
    type("Perera");
    expect(onSearch).toHaveBeenLastCalledWith("Perera");
  });

  it("does not search for a picked item's label, which would empty the list", () => {
    const { onSearch, type } = setup();
    type("H.A. Perera - EMP001");
    expect(onSearch).not.toHaveBeenCalledWith("H.A. Perera - EMP001");
  });
});
