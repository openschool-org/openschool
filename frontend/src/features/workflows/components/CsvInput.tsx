import { useState } from "react";
import { Button, Input, Tag, Upload } from "antd";
import { CheckOutlined, DownloadOutlined, FileTextOutlined, UploadOutlined } from "@ant-design/icons";
import Field from "@/shared/ui/Field";

interface Props {
  id: string;
  label: string;
  help?: string;
  template?: string;
  value: string;
  onChange: (value: string) => void;
}

function downloadTemplate(template: string, name: string) {
  const url = URL.createObjectURL(new Blob([template], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// The backend sends one rule per line. An older single-paragraph help is split into sentences instead,
// without breaking on initials such as "H.A.N. Perera" or class names such as "6-A.".
function toRules(help: string): string[] {
  const lines = help.split("\n").map((r) => r.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return help.split(/(?<=[a-z0-9)]\.)\s+(?=[A-Z])/).map((r) => r.trim()).filter(Boolean);
}

// Column names inside a rule (class, guardian_nic, ...) are shown the same way as the column tags.
function RuleText({ rule, columns }: { rule: string; columns: string[] }) {
  if (columns.length === 0) return <>{rule}</>;
  const pattern = new RegExp(`\\b(${[...columns].sort((a, b) => b.length - a.length).join("|")})\\b`, "g");
  return <>{rule.split(pattern).map((part, i) => (columns.includes(part) ? <code key={i} className="os-csv__col">{part}</code> : part))}</>;
}

// A CSV input as three steps: get the template, fill it in (the backend's rules, one per line), then upload or paste.
// The backend sends the template and rules, so the columns live in one place.
export default function CsvInput({ id, label, help, template, value, onChange }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const rows = value.trim() ? value.trim().split(/\r?\n/).length - 1 : 0;
  const columns = template ? template.split(/\r?\n/)[0].split(",").filter(Boolean) : [];
  const rules = toRules(help ?? "");

  return (
    <ol className="os-csv os-workflow-inputs__wide">
      {template && (
        <li className="os-csv__step">
          <h3 className="os-csv__title">Download the template</h3>
          <p className="os-csv__text">It has the columns below and two example rows. Keep the header row as it is.</p>
          <div className="os-csv__columns">
            {columns.map((c) => <Tag key={c} variant="filled">{c}</Tag>)}
          </div>
          <Button icon={<DownloadOutlined aria-hidden="true" />} onClick={() => downloadTemplate(template, id.replace(/^wf-/, ""))}>
            Download template
          </Button>
        </li>
      )}

      {rules.length > 0 && (
        <li className="os-csv__step">
          <h3 className="os-csv__title">Fill it in</h3>
          <ul className="os-csv__rules">
            {rules.map((r) => (
              <li key={r}><CheckOutlined className="os-csv__rule-icon" aria-hidden="true" /><span><RuleText rule={r} columns={columns} /></span></li>
            ))}
          </ul>
        </li>
      )}

      <li className="os-csv__step">
        <h3 className="os-csv__title">Upload the file</h3>
        <Upload.Dragger
          accept=".csv,text/csv"
          showUploadList={false}
          beforeUpload={(file) => {
            setFileName(file.name);
            void file.text().then(onChange);
            return false;
          }}
        >
          <span className="os-csv__drop">
            <UploadOutlined aria-hidden="true" className="os-csv__drop-icon" />
            <span>Click to choose a CSV file, or drag it here</span>
          </span>
        </Upload.Dragger>
        {rows > 0 && (
          <p className="os-csv__ready">
            <FileTextOutlined aria-hidden="true" />
            {fileName && <strong>{fileName}</strong>}
            <span>{rows === 1 ? "1 row" : `${rows} rows`} after the header</span>
          </p>
        )}
        <div className="os-mt-4">
          <Field id={id} label={label} helper="Or paste the CSV text here instead of uploading a file.">
            <Input.TextArea id={id} rows={5} value={value} placeholder="class,index_number,full_name,…" onChange={(e) => { setFileName(null); onChange(e.target.value); }} />
          </Field>
        </div>
      </li>
    </ol>
  );
}
