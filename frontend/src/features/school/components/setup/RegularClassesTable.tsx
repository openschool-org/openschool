import type { Dispatch, SetStateAction } from "react";
import { InputNumber, Select } from "antd";
import { regularClassName } from "@/features/school/setupConstants";

interface Props {
  grades: number[];
  sectionsPerGrade: Record<number, number>;
  setSectionsPerGrade: Dispatch<SetStateAction<Record<number, number>>>;
  mediums: string[];
  sectionMediums: Record<string, string>;
  setSectionMediums: Dispatch<SetStateAction<Record<string, string>>>;
}

// One row per regular grade: how many sections, and the classes (with medium) that creates.
export default function RegularClassesTable({ grades, sectionsPerGrade, setSectionsPerGrade, mediums, sectionMediums, setSectionMediums }: Props) {
  const mediumOptions = [...mediums.map((m) => ({ value: m, label: m })), { value: "", label: "No medium" }];

  return (
    <table className="os-table os-table--no-hover os-setup-table">
      <thead>
        <tr>
          <th className="os-setup-table__narrow">Grade</th>
          <th className="os-setup-table__narrow">Sections</th>
          <th>{mediums.length > 0 ? "Classes and medium" : "Classes"}</th>
        </tr>
      </thead>
      <tbody>
        {grades.map((grade) => {
          const count = sectionsPerGrade[grade] ?? 1;
          return (
            <tr key={grade}>
              <td className="os-setup-table__strong">Grade {grade}</td>
              <td>
                <InputNumber
                  id={`sections-${grade}`}
                  aria-label={`Sections for Grade ${grade}`}
                  min={0}
                  max={10}
                  value={count}
                  className="os-setup-table__number"
                  onChange={(value) => setSectionsPerGrade((prev) => ({ ...prev, [grade]: typeof value === "number" ? value : 0 }))}
                />
              </td>
              <td>
                {count === 0 ? (
                  <span className="os-setup-muted">No classes</span>
                ) : (
                  <div className="os-setup-classes">
                    {Array.from({ length: count }, (_, i) => {
                      const name = regularClassName(grade, i);
                      const key = `${grade}-${i}`;
                      return mediums.length > 0 ? (
                        <span key={key} className="os-setup-class">
                          <span className="os-setup-class__name">{name}</span>
                          <Select
                            id={`section-medium-${grade}-${i}`}
                            aria-label={`Medium for ${name}`}
                            size="small"
                            variant="borderless"
                            popupMatchSelectWidth={false}
                            value={sectionMediums[key] ?? mediums[0]}
                            options={mediumOptions}
                            onChange={(value: string) => setSectionMediums((prev) => ({ ...prev, [key]: value }))}
                          />
                        </span>
                      ) : (
                        <span key={key} className="os-setup-class"><span className="os-setup-class__name">{name}</span></span>
                      );
                    })}
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
