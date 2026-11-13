import { useMemo, useState } from "react";
import { Alert, Button, Checkbox } from "antd";
import { DownloadOutlined, PrinterOutlined } from "@ant-design/icons";
import type { GeneratedBatch } from "@/features/activation/api/activation";
import { downloadBatchCsv, groupByClass } from "@/features/activation/lib/codeSheet";
import { usePrintSheet } from "@/features/activation/hooks/usePrintSheet";
import CodeSlips from "@/features/activation/components/CodeSlips";
import { useSchool } from "@/features/school/queries/useSchool";
import { formatDate } from "@/shared/lib/date";

// A fresh batch, split by class, ready to print or save as PDF one class at a time.
// reopened is true when shown again from Issued batches, where only unused codes appear.
export default function IssuedBatchPanel({ batch, onDone, reopened = false }: { batch: GeneratedBatch; onDone: () => void; reopened?: boolean }) {
  const { data: school } = useSchool();
  const groups = useMemo(() => groupByClass(batch), [batch]);
  const [withHandOutList, setWithHandOutList] = useState(true);
  const { selected, print } = usePrintSheet();

  if (batch.codes.length === 0) {
    return <Alert type="info" showIcon title="Nobody to issue" description="Everyone in this selection already has a login." />;
  }

  return (
    <>
      <Alert
        type="warning"
        showIcon
        title={`${batch.codes.length} codes in ${groups.length} ${groups.length === 1 ? "class" : "classes"}, valid until ${formatDate(batch.expires_at)}`}
        description={reopened
          ? "Unused codes from this batch. Print a class or save it as a PDF (choose Save as PDF in the print window); Ctrl+P also prints the code sheets. Opening codes is recorded in the audit log."
          : "Print a class or save it as a PDF (choose Save as PDF in the print window); Ctrl+P also prints the code sheets. You can reopen unused codes later from Issued batches."}
      />
      <div className="os-flex os-gap-2 os-items-center os-wrap os-my-4">
        <Button type="primary" icon={<PrinterOutlined />} onClick={() => print(null)}>Print all classes</Button>
        <Button icon={<DownloadOutlined />} onClick={() => downloadBatchCsv(batch)}>Download CSV</Button>
        <Checkbox id="codes-hand-out" checked={withHandOutList} onChange={(e) => setWithHandOutList(e.target.checked)}>Include the class hand-out list</Checkbox>
        <Button type="text" className="os-ml-auto" onClick={onDone}>Done</Button>
      </div>
      <table className="os-table">
        <thead>
          <tr>
            <th>Class</th>
            <th>Form teacher</th>
            <th>Codes</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key}>
              <td className="os-fw-500">{g.title}</td>
              <td>{g.formTeacher || "-"}</td>
              <td>{g.codes.length}</td>
              <td className="os-text-right"><Button size="small" icon={<PrinterOutlined />} onClick={() => print([g.key])}>Print / PDF</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <CodeSlips
        role={batch.role}
        groups={selected ? groups.filter((g) => selected.includes(g.key)) : groups}
        schoolName={school?.name ?? "OpenSchool"}
        expiresAt={batch.expires_at}
        withHandOutList={withHandOutList}
      />
    </>
  );
}
