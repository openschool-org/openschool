import { useRef, useState } from "react";
import { Button } from "antd";
import { BankOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";

const MAX_LOGO_BYTES = 500 * 1024;
// Raster formats the server accepts (school.go imageSignatures); SVG is refused there.
const LOGO_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

interface LogoUploadProps {
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
  saving?: boolean;
}

export default function LogoUpload({ value, editing, onChange, saving }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("Choose a PNG, JPG, GIF or WebP image.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Image is too large - please choose one under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="os-logo-upload">
      <div className="os-logo-upload__frame">
        {value ? <img src={value} alt="School logo" /> : <BankOutlined aria-hidden="true" />}
      </div>
      <div className="os-min-w-0">
        <p className="os-m-0 os-text-sm os-c-secondary">{value ? "Shown on reports and the sign-in page." : "No logo yet."}</p>
        <p className="os-m-0 os-text-xs os-c-tertiary">PNG, JPG, GIF or WebP, under 500KB.</p>
        {editing && (
          <div className="os-flex os-gap-2 os-mt-3">
            <Button size="small" icon={<UploadOutlined />} loading={saving} onClick={() => inputRef.current?.click()}>{value ? "Change" : "Upload"}</Button>
            {value && <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={saving} onClick={() => onChange("")}>Remove</Button>}
            <input
              ref={inputRef}
              type="file"
              accept={LOGO_TYPES.join(",")}
              aria-label="Choose a logo image"
              className="os-hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                // Clear it so choosing the same file again still fires onChange.
                e.target.value = "";
              }}
            />
          </div>
        )}
        {error && <p className="os-text-xs os-c-danger os-mt-2 os-mb-0">{error}</p>}
      </div>
    </div>
  );
}
