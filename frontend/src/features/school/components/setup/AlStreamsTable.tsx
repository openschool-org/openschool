import type { Dispatch, SetStateAction } from "react";
import { Checkbox, Input, InputNumber } from "antd";
import { AL_STREAM_DEFS, alClassName, type ALStreamKey, type AlStreamsByGradeState, type AlStreamsState } from "@/features/school/setupConstants";

interface Props {
  grade: number;
  streams: AlStreamsState;
  setAlStreams: Dispatch<SetStateAction<AlStreamsByGradeState>>;
}

// One row per A/L stream for a grade: on/off, short code, section count, and the classes that creates.
export default function AlStreamsTable({ grade, streams, setAlStreams }: Props) {
  const update = (key: ALStreamKey, patch: Partial<AlStreamsState[ALStreamKey]>) =>
    setAlStreams((prev) => ({ ...prev, [grade]: { ...prev[grade], [key]: { ...prev[grade][key], ...patch } } }));

  return (
    <table className="os-table os-table--no-hover os-setup-table">
      <thead>
        <tr>
          <th>Stream</th>
          <th className="os-setup-table__narrow">Code</th>
          <th className="os-setup-table__narrow">Sections</th>
          <th>Classes</th>
        </tr>
      </thead>
      <tbody>
        {AL_STREAM_DEFS.map((def) => {
          const cfg = streams[def.key];
          // A blank code falls back to the default letter when the classes are created.
          const code = cfg.code.trim() || def.defaultCode;
          return (
            <tr key={def.key} className={cfg.enabled ? undefined : "is-off"}>
              <td>
                <Checkbox id={`al-${grade}-${def.key}`} checked={cfg.enabled} onChange={(e) => update(def.key, { enabled: e.target.checked })}>
                  {def.label}
                </Checkbox>
              </td>
              <td>
                <Input
                  id={`al-code-${grade}-${def.key}`}
                  aria-label={`Grade ${grade} ${def.label} code`}
                  maxLength={3}
                  disabled={!cfg.enabled}
                  placeholder={def.defaultCode}
                  value={cfg.code}
                  className="os-setup-table__code-input"
                  onChange={(e) => update(def.key, { code: e.target.value })}
                />
              </td>
              <td>
                <InputNumber
                  id={`al-sections-${grade}-${def.key}`}
                  aria-label={`Grade ${grade} ${def.label} sections`}
                  min={0}
                  max={10}
                  disabled={!cfg.enabled}
                  value={cfg.sections}
                  className="os-setup-table__number"
                  onChange={(value) => update(def.key, { sections: typeof value === "number" ? value : 0 })}
                />
              </td>
              <td>
                {!cfg.enabled || cfg.sections === 0 ? (
                  <span className="os-setup-muted">None</span>
                ) : (
                  <div className="os-setup-classes">
                    {Array.from({ length: cfg.sections }, (_, i) => (
                      <span key={i} className="os-setup-class"><span className="os-setup-class__name">{alClassName(grade, code, i)}</span></span>
                    ))}
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
