import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import DataGrid from "@/shared/ui/DataGrid";
import type { GridColumn } from "@/shared/ui/DataGrid";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, name: `Name ${i}` }));
const columns: GridColumn<Row>[] = [{ key: "name", header: "Name", render: (r) => r.name }];
const bodyRows = (container: HTMLElement) => container.querySelectorAll("tbody tr.ant-table-row");

describe("DataGrid", () => {
  it("pages client-side rows by pageSize", () => {
    const { container } = render(<DataGrid rows={rows} columns={columns} getRowId={(r) => r.id} pageSize={10} />);
    expect(bodyRows(container)).toHaveLength(10);
    expect(screen.getByText("Name 0")).toBeTruthy();
    expect(screen.queryByText("Name 10")).toBeNull();
  });

  it("renders every row when pagination is off", () => {
    const { container } = render(<DataGrid rows={rows} columns={columns} getRowId={(r) => r.id} pagination={false} />);
    expect(bodyRows(container)).toHaveLength(30);
  });

  it("renders server rows as given and shows the count label", () => {
    const page = rows.slice(0, 5);
    render(
      <DataGrid
        rows={page}
        columns={columns}
        getRowId={(r) => r.id}
        server={{ page: 1, pageSize: 5, totalItems: 30, onChange: () => {} }}
        countLabel={(shown, total) => `${shown} of ${total}`}
      />,
    );
    expect(screen.getByText("5 of 30")).toBeTruthy();
  });

  it("puts the column name on each cell for the phone layout", () => {
    const { container } = render(<DataGrid rows={rows.slice(0, 1)} columns={columns} getRowId={(r) => r.id} />);
    expect(container.querySelector("tbody td[data-label='Name']")).not.toBeNull();
  });

  it("calls onRowClick on click and on Enter", () => {
    const onRowClick = vi.fn();
    render(<DataGrid rows={rows.slice(0, 1)} columns={columns} getRowId={(r) => r.id} onRowClick={onRowClick} />);
    const row = screen.getByText("Name 0").closest("tr")!;
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(2);
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });

  it("keeps selections from other pages when a box is ticked", () => {
    const onSelectionChange = vi.fn();
    render(
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        pageSize={10}
        selected={new Set(["r20"])}
        onSelectionChange={onSelectionChange}
      />,
    );
    const box = screen.getByText("Name 1").closest("tr")!.querySelector<HTMLInputElement>("input[type='checkbox']")!;
    fireEvent.click(box);
    const next = onSelectionChange.mock.calls[0][0] as Set<string>;
    expect([...next].sort()).toEqual(["r1", "r20"]);
  });

  it("reports the clicked sortable column", () => {
    const onSortChange = vi.fn();
    const { container } = render(
      <DataGrid
        rows={rows.slice(0, 2)}
        columns={[{ ...columns[0], sortable: true }]}
        getRowId={(r) => r.id}
        sort={{ key: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    fireEvent.click(container.querySelector("th.ant-table-column-has-sorters")!);
    expect(onSortChange).toHaveBeenCalledWith("name");
  });
});
