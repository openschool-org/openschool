import api from "../lib/api";

export const ATTENDANCE_REPORT_COLUMNS = [
  { value: "date", label: "Date" },
  { value: "student", label: "Student" },
  { value: "index_number", label: "Index No." },
  { value: "status", label: "Status" },
  { value: "note", label: "Note" },
];

export const MARKS_REPORT_COLUMNS = [
  { value: "student", label: "Student" },
  { value: "index_number", label: "Index No." },
  { value: "marks", label: "Marks" },
  { value: "max_marks", label: "Max Marks" },
  { value: "percentage", label: "%" },
];

async function downloadPdf(url: string, params: Record<string, unknown>, filename: string) {
  const response = await api.get<Blob>(url, { params, responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export const reportExportApi = {
  exportAttendance: (params: { class_id: string; from: string; to: string; columns?: string[] }) =>
    downloadPdf("/reports/attendance", params, "attendance-report.pdf"),

  exportMarks: (params: { class_id: string; term_id: string; subject_id: string; columns?: string[] }) =>
    downloadPdf("/reports/marks", params, "marks-report.pdf"),
};
