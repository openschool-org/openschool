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
      setError("Image is too large - please choose one under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <p className="os-text-xs os-c-secondary os-mb-2">School logo (optional)</p>
      <div className="os-flex os-items-center os-gap-4">
        <div className="os-w-4 os-h-4 os-rounded-lg os-border os-bg-layer-hover os-flex os-items-center os-justify-center os-overflow-hidden os-shrink-0"
        >
          {value ? (
            <img src={value} alt="School logo" className="os-max-w-full os-max-h-full os-object-contain" />
          ) : (
            <Building size={24} className="os-fill-disabled" />
          )}
        </div>
        {editing && (
          <div className="os-flex os-gap-2">
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
              accept="image/*" className="os-hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        )}
      </div>
      {error && <p className="os-text-xs os-c-danger os-mt-2">{error}</p>}
    </div>
  );
}
