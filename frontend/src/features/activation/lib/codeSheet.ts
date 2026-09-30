import type { GeneratedBatch, IssuedCode } from "@/features/activation/api/activation";
import { formatDate } from "@/shared/lib/date";
import { classLabel } from "@/shared/lib/classLabel";

// One class's share of a batch: what one class teacher hands out.
export interface ClassGroup {
  key: string;
  title: string;
  formTeacher: string;
  codes: IssuedCode[];
}

const NO_CLASS = "Not in a class";

// Groups codes by class in grade order; people without a current class come last.
export function groupByClass(batch: GeneratedBatch): ClassGroup[] {
  const groups = new Map<string, ClassGroup & { order: number }>();
  for (const c of batch.codes) {
    const key = c.class_name ? `${c.grade_name}|${c.class_name}` : NO_CLASS;
    let group = groups.get(key);
    if (!group) {
      const title = c.class_name ? classLabel(c.grade_name, c.class_name) : NO_CLASS;
      group = { key, title, formTeacher: c.form_teacher, codes: [], order: c.class_name ? c.grade_order : Number.MAX_SAFE_INTEGER };
      groups.set(key, group);
    }
    group.codes.push(c);
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, undefined, { numeric: true }))
    .map((g) => ({ key: g.key, title: g.title, formTeacher: g.formTeacher, codes: [...g.codes].sort((a, b) => a.name.localeCompare(b.name)) }));
}

// Quotes every cell and defuses leading =+-@ so spreadsheet apps never run a cell as a formula.
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function batchToCsv(batch: GeneratedBatch): string {
  const isStudent = batch.role === "student";
  const header = ["Grade", "Class", "Form teacher", "Name", isStudent ? "Index number" : "Children", "Activation code", "Expires"];
  const rows = [header];
  for (const group of groupByClass(batch)) {
    for (const c of group.codes) {
      rows.push([c.grade_name, c.class_name, c.form_teacher, c.name, isStudent ? c.index_number ?? "" : c.detail, c.code, formatDate(batch.expires_at)]);
    }
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function downloadBatchCsv(batch: GeneratedBatch) {
  const url = URL.createObjectURL(new Blob([batchToCsv(batch)], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `activation-codes-${batch.role}-${formatDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
