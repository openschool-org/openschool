import { useRef, useState } from "react";
import { Button } from "@carbon/react";
import { Upload, TrashCan, Building } from "@carbon/icons-react";

const MAX_LOGO_BYTES = 500 * 1024;

interface LogoUploadProps {
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}

export default function LogoUpload({ value, editing, onChange }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Image is too large — please choose one under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <p style={{ fontSize: "0.75rem", color: "#525252", marginBottom: "0.5rem" }}>School Logo (optional)</p>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
            background: "#fafafa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {value ? (
            <img src={value} alt="School logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          ) : (
            <Building size={24} style={{ fill: "#c6c6c6" }} />
          )}
        </div>
        {editing && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button kind="tertiary" size="sm" renderIcon={Upload} onClick={() => inputRef.current?.click()}>
              {value ? "Change" : "Upload"}
            </Button>
            {value && (
              <Button kind="ghost" size="sm" renderIcon={TrashCan} onClick={() => onChange("")}>
                Remove
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: "0.75rem", color: "#da1e28", marginTop: "0.5rem" }}>{error}</p>}
    </div>
  );
}
