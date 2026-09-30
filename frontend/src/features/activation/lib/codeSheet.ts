import type { GeneratedBatch } from "@/features/activation/api/activation";
import { formatDate } from "@/shared/lib/date";

// Quotes every cell and defuses leading =+-@ so spreadsheet apps never run a cell as a formula.
function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function batchToCsv(batch: GeneratedBatch): string {
  const detailHeader = batch.role === "student" ? "Class" : "Children";
  const rows = [["Name", detailHeader, "Activation code", "Expires"]];
  for (const c of batch.codes) rows.push([c.name, c.detail, c.code, formatDate(batch.expires_at)]);
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
