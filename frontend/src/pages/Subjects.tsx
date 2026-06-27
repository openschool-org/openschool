import { useState } from "react";
import { Link } from "react-router";
import { Book, Add, ChevronDown, ChevronUp } from "@carbon/icons-react";
import { Button, Tag, Tabs, TabList, Tab, TabPanels, TabPanel } from "@carbon/react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Subject = { code: string; name: string };
type Combination = { label: string; subjects: Subject[] };
type Stream = {
  id: string;
  name: string;
  tagType: "blue" | "green" | "purple" | "teal" | "magenta";
  combinations: Combination[];
  note?: string;
};

// ─── Primary (Grades 1–5) ─────────────────────────────────────────────────────
const PRI_SUBJECTS: Subject[] = [
  { code: "PRI-01", name: "First Language (Sinhala or Tamil)" },
  { code: "PRI-02", name: "Second Language (English)" },
  { code: "PRI-03", name: "Mathematics" },
  { code: "PRI-04", name: "Environmental Related Activities" },
  { code: "PRI-05", name: "Religion" },
  { code: "PRI-06", name: "Aesthetic Education" },
  { code: "PRI-07", name: "Health & Physical Education" },
];

// ─── Lower Secondary (Grades 6–9) ────────────────────────────────────────────
const GEN_SUBJECTS: Subject[] = [
  { code: "GEN-L01",  name: "First Language (Sinhala)" },
  { code: "GEN-L02",  name: "First Language (Tamil)" },
  { code: "GEN-L03",  name: "Second National Language (Tamil)" },
  { code: "GEN-L04",  name: "Second National Language (Sinhala)" },
  { code: "GEN-L05",  name: "English" },
  { code: "GEN-M01",  name: "Mathematics" },
  { code: "GEN-S01",  name: "Science" },
  { code: "GEN-SS01", name: "History" },
  { code: "GEN-SS02", name: "Geography" },
  { code: "GEN-SS03", name: "Civic Education" },
  { code: "GEN-R01",  name: "Religion (Buddhism)" },
  { code: "GEN-R02",  name: "Religion (Hinduism)" },
  { code: "GEN-R03",  name: "Religion (Islam)" },
  { code: "GEN-R04",  name: "Religion (Christianity)" },
  { code: "GEN-P01",  name: "Health & Physical Education" },
  { code: "GEN-AE01", name: "Art" },
  { code: "GEN-AE02", name: "Music" },
  { code: "GEN-AE03", name: "Dancing" },
  { code: "GEN-T01",  name: "Practical & Technical Skills" },
  { code: "GEN-T02",  name: "Information & Communication Technology" },
];

// ─── O/L (Grades 10–11) ──────────────────────────────────────────────────────
const OL_MANDATORY: Subject[] = [
  { code: "OL-M01", name: "First Language (Sinhala)" },
  { code: "OL-M02", name: "First Language (Tamil)" },
  { code: "OL-M03", name: "English" },
  { code: "OL-M04", name: "Mathematics" },
  { code: "OL-M05", name: "Science" },
  { code: "OL-M06", name: "History" },
  { code: "OL-M07", name: "Buddhism" },
  { code: "OL-M08", name: "Catholicism" },
  { code: "OL-M09", name: "Christianity" },
  { code: "OL-M10", name: "Islam" },
  { code: "OL-M11", name: "Shaivism" },
];

const OL_BASKET_1: Subject[] = [
  { code: "OL-B1-01",  name: "Business & Accounting Studies" },
  { code: "OL-B1-02",  name: "Geography" },
  { code: "OL-B1-03",  name: "Civic Education" },
  { code: "OL-B1-04",  name: "Entrepreneurship Studies" },
  { code: "OL-B1-L01", name: "Sinhala (Second Language)" },
  { code: "OL-B1-L02", name: "Tamil (Second Language)" },
  { code: "OL-B1-L03", name: "French" },
  { code: "OL-B1-L04", name: "German" },
  { code: "OL-B1-L05", name: "Hindi" },
  { code: "OL-B1-L06", name: "Japanese" },
  { code: "OL-B1-L07", name: "Arabic" },
  { code: "OL-B1-L08", name: "Korean" },
  { code: "OL-B1-L09", name: "Chinese" },
  { code: "OL-B1-L10", name: "Russian" },
  { code: "OL-B1-L11", name: "Pali" },
  { code: "OL-B1-L12", name: "Sanskrit" },
];

const OL_BASKET_2: Subject[] = [
  { code: "OL-B2-01", name: "Music (Oriental)" },
  { code: "OL-B2-02", name: "Music (Western)" },
  { code: "OL-B2-03", name: "Music (Carnatic)" },
  { code: "OL-B2-04", name: "Dancing (Indigenous)" },
  { code: "OL-B2-05", name: "Dancing (Bharatha)" },
  { code: "OL-B2-06", name: "Art" },
  { code: "OL-B2-07", name: "Drama & Theatre" },
  { code: "OL-B2-08", name: "Appreciation of English Literary Texts" },
  { code: "OL-B2-09", name: "Appreciation of Sinhala Literary Texts" },
  { code: "OL-B2-10", name: "Appreciation of Tamil Literary Texts" },
  { code: "OL-B2-11", name: "Appreciation of Arabic Literary Texts" },
];

const OL_BASKET_3: Subject[] = [
  { code: "OL-B3-01", name: "Information & Communication Technology" },
  { code: "OL-B3-02", name: "Agriculture & Food Technology" },
  { code: "OL-B3-03", name: "Aquatic Bio-resources Technology" },
  { code: "OL-B3-04", name: "Design & Construction Technology" },
  { code: "OL-B3-05", name: "Design & Mechanical Technology" },
  { code: "OL-B3-06", name: "Design, Electrical & Electronic Technology" },
  { code: "OL-B3-07", name: "Arts & Crafts" },
  { code: "OL-B3-08", name: "Home Economics" },
  { code: "OL-B3-09", name: "Health & Physical Education" },
  { code: "OL-B3-10", name: "Communication & Media Studies" },
  { code: "OL-B3-11", name: "Electronic Writing & Shorthand" },
];

// ─── A/L (Grades 12–13) ──────────────────────────────────────────────────────
const AL_COMPULSORY: Subject[] = [
  { code: "AL-13", name: "General English" },
  { code: "AL-12", name: "Common General Test" },
];

const AL_ARTS_SUBJECTS: Subject[] = [
  { code: "AL-21",  name: "Economics" },
  { code: "AL-22",  name: "Geography" },
  { code: "AL-23",  name: "Political Science" },
  { code: "AL-24",  name: "Logic and Scientific Method" },
  { code: "AL-25",  name: "History of Sri Lanka" },
  { code: "AL-25A", name: "History of India" },
  { code: "AL-25B", name: "History of Europe" },
  { code: "AL-25C", name: "Modern World History" },
  { code: "AL-28",  name: "Home Economics" },
  { code: "AL-29",  name: "Communication & Media Studies" },
  { code: "AL-41",  name: "Buddhism" },
  { code: "AL-42",  name: "Hinduism" },
  { code: "AL-43",  name: "Christianity" },
  { code: "AL-44",  name: "Islam" },
  { code: "AL-45",  name: "Buddhist Civilization" },
  { code: "AL-46",  name: "Hindu Civilization" },
  { code: "AL-47",  name: "Islam Civilization" },
  { code: "AL-48",  name: "Greek and Roman Civilization" },
  { code: "AL-49",  name: "Christian Civilization" },
  { code: "AL-51",  name: "Art" },
  { code: "AL-52",  name: "Dancing (Indigenous)" },
  { code: "AL-53",  name: "Dancing (Bharatha)" },
  { code: "AL-54",  name: "Music (Oriental)" },
  { code: "AL-55",  name: "Music (Carnatic)" },
  { code: "AL-56",  name: "Music (Western)" },
  { code: "AL-57",  name: "Drama and Theatre (Sinhala)" },
  { code: "AL-58",  name: "Drama and Theatre (Tamil)" },
  { code: "AL-59",  name: "Drama and Theatre (English)" },
  { code: "AL-71",  name: "Sinhala" },
  { code: "AL-72",  name: "Tamil" },
  { code: "AL-73",  name: "English" },
  { code: "AL-74",  name: "Pali" },
  { code: "AL-75",  name: "Sanskrit" },
  { code: "AL-78",  name: "Arabic" },
  { code: "AL-79",  name: "Malay" },
  { code: "AL-81",  name: "French" },
  { code: "AL-82",  name: "German" },
  { code: "AL-83",  name: "Russian" },
  { code: "AL-84",  name: "Hindi" },
  { code: "AL-86",  name: "Chinese" },
  { code: "AL-87",  name: "Japanese" },
];

const AL_STREAMS: Stream[] = [
  {
    id: "physical-science",
    name: "Physical Science",
    tagType: "blue",
    combinations: [
      {
        label: "Standard",
        subjects: [
          { code: "AL-01", name: "Physics" },
          { code: "AL-10", name: "Combined Mathematics" },
          { code: "AL-02", name: "Chemistry" },
        ],
      },
      {
        label: "Alternative",
        subjects: [
          { code: "AL-01", name: "Physics" },
          { code: "AL-10", name: "Combined Mathematics" },
          { code: "AL-20", name: "Information & Communication Technology" },
        ],
      },
    ],
  },
  {
    id: "bio-science",
    name: "Biological Science",
    tagType: "green",
    combinations: [
      {
        label: "Standard",
        subjects: [
          { code: "AL-09", name: "Biology" },
          { code: "AL-02", name: "Chemistry" },
          { code: "AL-01", name: "Physics" },
        ],
      },
      {
        label: "Alternative",
        subjects: [
          { code: "AL-09", name: "Biology" },
          { code: "AL-02", name: "Chemistry" },
          { code: "AL-08", name: "Agricultural Science" },
        ],
      },
    ],
  },
  {
    id: "technology",
    name: "Technology",
    tagType: "purple",
    combinations: [
      {
        label: "Engineering Technology",
        subjects: [
          { code: "AL-65", name: "Engineering Technology" },
          { code: "AL-67", name: "Science for Technology" },
          { code: "AL-20", name: "Information & Communication Technology" },
        ],
      },
      {
        label: "Biosystems Technology",
        subjects: [
          { code: "AL-66", name: "Biosystems Technology" },
          { code: "AL-67", name: "Science for Technology" },
          { code: "AL-20", name: "Information & Communication Technology" },
        ],
      },
    ],
  },
  {
    id: "commerce",
    name: "Commerce",
    tagType: "teal",
    combinations: [
      {
        label: "Standard",
        subjects: [
          { code: "AL-33", name: "Accountancy" },
          { code: "AL-32", name: "Business Studies" },
          { code: "AL-21", name: "Economics" },
        ],
      },
    ],
  },
  {
    id: "arts",
    name: "Arts",
    tagType: "magenta",
    combinations: [],
    note: `Any 3 subjects from the approved Arts list (${AL_ARTS_SUBJECTS.length} subjects)`,
  },
];

// ─── All subjects flat list for "All Subjects" tab ───────────────────────────
const ALL_SUBJECTS: (Subject & { level: string })[] = [
  ...PRI_SUBJECTS.map(s => ({ ...s, level: "Primary" })),
  ...GEN_SUBJECTS.map(s => ({ ...s, level: "Lower Secondary" })),
  ...OL_MANDATORY.map(s => ({ ...s, level: "O/L" })),
  ...OL_BASKET_1.map(s => ({ ...s, level: "O/L" })),
  ...OL_BASKET_2.map(s => ({ ...s, level: "O/L" })),
  ...OL_BASKET_3.map(s => ({ ...s, level: "O/L" })),
  ...AL_COMPULSORY.map(s => ({ ...s, level: "A/L" })),
  ...AL_ARTS_SUBJECTS.map(s => ({ ...s, level: "A/L" })),
  // Additional A/L subjects not in arts list
  { code: "AL-01", name: "Physics",                   level: "A/L" },
  { code: "AL-02", name: "Chemistry",                 level: "A/L" },
  { code: "AL-07", name: "Mathematics",               level: "A/L" },
  { code: "AL-08", name: "Agricultural Science",      level: "A/L" },
  { code: "AL-09", name: "Biology",                   level: "A/L" },
  { code: "AL-10", name: "Combined Mathematics",      level: "A/L" },
  { code: "AL-11", name: "Higher Mathematics",        level: "A/L" },
  { code: "AL-14", name: "Civil Technology",          level: "A/L" },
  { code: "AL-15", name: "Mechanical Technology",     level: "A/L" },
  { code: "AL-16", name: "Electrical, Electronic & IT", level: "A/L" },
  { code: "AL-17", name: "Food Technology",           level: "A/L" },
  { code: "AL-18", name: "Agriculture Technology",    level: "A/L" },
  { code: "AL-19", name: "BioResource Technology",    level: "A/L" },
  { code: "AL-20", name: "Information & Communication Technology", level: "A/L" },
  { code: "AL-31", name: "Business Statistics",       level: "A/L" },
  { code: "AL-65", name: "Engineering Technology",    level: "A/L" },
  { code: "AL-66", name: "Biosystems Technology",     level: "A/L" },
  { code: "AL-67", name: "Science for Technology",    level: "A/L" },
].sort((a, b) => a.code.localeCompare(b.code));

// De-duplicate (AL- subjects appear in multiple lists above)
const UNIQUE_ALL_SUBJECTS = ALL_SUBJECTS.filter(
  (s, i, arr) => arr.findIndex(x => x.code === s.code) === i
);

// ─── Sub-components ───────────────────────────────────────────────────────────
function SubjectChip({ subject }: { subject: Subject }) {
  return (
    <div
      style={{
        padding: "0.5rem 0.75rem",
        border: "1px solid #e0e0e0",
        borderRadius: "4px",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: "0.125rem",
      }}
    >
      <span style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#161616", lineHeight: 1.3 }}>
        {subject.name}
      </span>
      <span style={{ fontSize: "0.6875rem", fontFamily: "IBM Plex Mono, monospace", color: "#8d8d8d" }}>
        {subject.code}
      </span>
    </div>
  );
}

function SubjectGrid({ subjects }: { subjects: Subject[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: "0.5rem",
      }}
    >
      {subjects.map(s => (
        <SubjectChip key={s.code} subject={s} />
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
  accentColor = "#406AAF",
}: {
  title: string;
  subtitle?: string;
  count?: number;
  accentColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        borderLeft: `3px solid ${accentColor}`,
        paddingLeft: "0.75rem",
        marginBottom: "0.75rem",
      }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "#161616" }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: "0.125rem 0 0", fontSize: "0.8125rem", color: "#6f6f6f" }}>
            {subtitle}
          </p>
        )}
      </div>
      {count !== undefined && (
        <span style={{ fontSize: "0.75rem", color: "#8d8d8d", whiteSpace: "nowrap" }}>
          {count} {count === 1 ? "subject" : "subjects"}
        </span>
      )}
    </div>
  );
}

function BasketSection({
  label,
  description,
  subjects,
  accentColor,
}: {
  label: string;
  description: string;
  subjects: Subject[];
  accentColor: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e0e0e0",
        borderRadius: "6px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <div
        style={{
          padding: "0.75rem 1rem",
          background: "#f4f4f4",
          borderBottom: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span
            style={{
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "#161616",
              marginRight: "0.5rem",
            }}
          >
            {label}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "#6f6f6f" }}>— {description}</span>
        </div>
        <Tag type="blue" size="sm">
          pick 1 of {subjects.length}
        </Tag>
      </div>
      <div style={{ padding: "0.75rem" }}>
        <SubjectGrid subjects={subjects} />
      </div>
      <div
        style={{
          padding: "0.5rem 1rem",
          borderTop: "1px solid #f4f4f4",
          background: accentColor + "10",
        }}
      >
        <span style={{ fontSize: "0.75rem", color: "#525252" }}>
          Student selects <strong>1 subject</strong> from this basket
        </span>
      </div>
    </div>
  );
}

function StreamCard({ stream }: { stream: Stream }) {
  const [artsExpanded, setArtsExpanded] = useState(false);

  const streamColors: Record<string, string> = {
    blue: "#0043ce",
    green: "#198038",
    purple: "#6929c4",
    teal: "#007d79",
    magenta: "#9f1853",
  };
  const color = streamColors[stream.tagType];

  return (
    <div
      style={{
        border: `1px solid ${color}40`,
        borderRadius: "6px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Stream header */}
      <div
        style={{
          padding: "0.75rem 1rem",
          background: `${color}0d`,
          borderBottom: `1px solid ${color}30`,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Book size={16} style={{ fill: color }} />
        <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "#161616" }}>
          {stream.name}
        </span>
        <Tag type={stream.tagType} size="sm" style={{ marginLeft: "auto" }}>
          {stream.combinations.length > 0
            ? `${stream.combinations.length} combination${stream.combinations.length > 1 ? "s" : ""}`
            : "choice of 3"}
        </Tag>
      </div>

      <div style={{ padding: "0.75rem" }}>
        {stream.id === "arts" ? (
          /* Arts stream — expandable subject list */
          <>
            <p style={{ fontSize: "0.8125rem", color: "#525252", margin: "0 0 0.75rem" }}>
              {stream.note}
            </p>
            <button
              onClick={() => setArtsExpanded(!artsExpanded)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                background: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "4px",
                padding: "0.375rem 0.75rem",
                cursor: "pointer",
                fontSize: "0.8125rem",
                color: "#406AAF",
                fontWeight: 500,
                width: "100%",
                justifyContent: "center",
              }}
            >
              {artsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {artsExpanded ? "Hide" : "Show"} approved Arts subjects ({AL_ARTS_SUBJECTS.length})
            </button>
            {artsExpanded && (
              <div style={{ marginTop: "0.75rem" }}>
                <SubjectGrid subjects={AL_ARTS_SUBJECTS} />
              </div>
            )}
          </>
        ) : (
          /* Streams with defined combinations */
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {stream.combinations.map((combo, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#6f6f6f",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {combo.label}
                  {stream.combinations.length > 1 && (
                    <span
                      style={{
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: color,
                      }}
                    />
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {combo.subjects.map((s, j) => (
                    <div
                      key={s.code}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.375rem 0.625rem",
                        background: "#f4f4f4",
                        borderRadius: "4px",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <span
                        style={{
                          width: "1.25rem",
                          height: "1.25rem",
                          borderRadius: "50%",
                          background: color,
                          color: "#fff",
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {j + 1}
                      </span>
                      <span style={{ fontWeight: 500, color: "#161616", flex: 1 }}>
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontFamily: "IBM Plex Mono, monospace",
                          fontSize: "0.6875rem",
                          color: "#8d8d8d",
                        }}
                      >
                        {s.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab panels ───────────────────────────────────────────────────────────────
function PrimaryPanel() {
  return (
    <div style={{ paddingTop: "1.5rem" }}>
      <div
        style={{
          background: "#fff8e1",
          border: "1px solid #ffe082",
          borderRadius: "6px",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          fontSize: "0.875rem",
          color: "#795548",
        }}
      >
        <strong>Grades 1–5 curriculum:</strong> All students follow a common compulsory curriculum
        with no streams or subject choices. First Language is Sinhala or Tamil depending on the
        medium of instruction. Environmental Related Activities integrates basic science, social
        studies, and environmental awareness.
      </div>
      <SectionHeader
        title="Primary Subjects"
        subtitle="All 7 subjects are compulsory for every student in Grades 1–5"
        count={PRI_SUBJECTS.length}
        accentColor="#f59e0b"
      />
      <SubjectGrid subjects={PRI_SUBJECTS} />
    </div>
  );
}

function LowerSecondaryPanel() {
  return (
    <div style={{ paddingTop: "1.5rem" }}>
      <div
        style={{
          background: "#edf5ff",
          border: "1px solid #d0e2ff",
          borderRadius: "6px",
          padding: "0.75rem 1rem",
          marginBottom: "1.25rem",
          fontSize: "0.875rem",
          color: "#0043ce",
        }}
      >
        <strong>Grades 6–9 curriculum:</strong> Each student studies 13 of these 20 subjects per
        year. Subject selection varies by first language (Sinhala or Tamil), second national
        language, chosen religion, and school offering.
      </div>
      <SectionHeader
        title="All Lower Secondary Subjects"
        count={GEN_SUBJECTS.length}
        accentColor="#406AAF"
      />
      <SubjectGrid subjects={GEN_SUBJECTS} />
    </div>
  );
}

function OrdinaryLevelPanel() {
  return (
    <div style={{ paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          background: "#defbe6",
          border: "1px solid #a7f0ba",
          borderRadius: "6px",
          padding: "0.75rem 1rem",
          fontSize: "0.875rem",
          color: "#198038",
        }}
      >
        <strong>Grades 10–11 curriculum:</strong> 9 subjects total — 6 compulsory (choose 1
        language + 1 religion from the mandatory list) + 1 from each of the 3 baskets.
      </div>

      {/* Compulsory */}
      <div>
        <SectionHeader
          title="Compulsory Subjects"
          subtitle="First Language (1 of 2) + English + Mathematics + Science + History + Religion (1 of 5) = 6 subjects"
          count={OL_MANDATORY.length}
          accentColor="#da1e28"
        />
        <SubjectGrid subjects={OL_MANDATORY} />
      </div>

      {/* Baskets */}
      <BasketSection
        label="Basket 1"
        description="Academic & Languages"
        subjects={OL_BASKET_1}
        accentColor="#0043ce"
      />
      <BasketSection
        label="Basket 2"
        description="Arts & Literature"
        subjects={OL_BASKET_2}
        accentColor="#6929c4"
      />
      <BasketSection
        label="Basket 3"
        description="Technology & Practical Studies"
        subjects={OL_BASKET_3}
        accentColor="#007d79"
      />
    </div>
  );
}

function AdvancedLevelPanel() {
  return (
    <div style={{ paddingTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        style={{
          background: "#f6f2ff",
          border: "1px solid #d4bbff",
          borderRadius: "6px",
          padding: "0.75rem 1rem",
          fontSize: "0.875rem",
          color: "#6929c4",
        }}
      >
        <strong>Grades 12–13 curriculum:</strong> 5 subjects total — 2 compulsory (General English
        + Common General Test) + 3 subjects from the chosen stream.
      </div>

      {/* Compulsory */}
      <div>
        <SectionHeader
          title="Compulsory for All Streams"
          subtitle="Every Grade 12–13 student regardless of stream"
          count={AL_COMPULSORY.length}
          accentColor="#da1e28"
        />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {AL_COMPULSORY.map(s => (
            <div
              key={s.code}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 1rem",
                border: "2px solid #da1e28",
                borderRadius: "6px",
                background: "#fff1f1",
              }}
            >
              <Book size={16} style={{ fill: "#da1e28" }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#161616" }}>
                  {s.name}
                </div>
                <div
                  style={{
                    fontFamily: "IBM Plex Mono, monospace",
                    fontSize: "0.75rem",
                    color: "#8d8d8d",
                  }}
                >
                  {s.code}
                </div>
              </div>
              <Tag type="red" size="sm" style={{ marginLeft: "auto" }}>
                Compulsory
              </Tag>
            </div>
          ))}
        </div>
      </div>

      {/* Streams */}
      <div>
        <SectionHeader
          title="A/L Streams"
          subtitle="Students choose one stream and study all 3 subjects in it"
          accentColor="#6929c4"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: "1rem",
          }}
        >
          {AL_STREAMS.map(stream => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AllSubjectsPanel() {
  const levelColors: Record<string, "blue" | "green" | "purple" | "warm-gray"> = {
    "Primary": "warm-gray",
    "Lower Secondary": "blue",
    "O/L": "green",
    "A/L": "purple",
  };

  return (
    <div style={{ paddingTop: "1.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "0.9375rem", fontWeight: 600, color: "#161616" }}>
          All Subjects
        </h3>
        <span style={{ fontSize: "0.75rem", color: "#8d8d8d" }}>
          {UNIQUE_ALL_SUBJECTS.length} total
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f4f4f4", borderBottom: "2px solid #e0e0e0" }}>
            {["Code", "Subject", "Level"].map(h => (
              <th
                key={h}
                style={{
                  padding: "0.625rem 1rem",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#525252",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {UNIQUE_ALL_SUBJECTS.map((s, i) => (
            <tr
              key={s.code}
              style={{
                borderBottom: i < UNIQUE_ALL_SUBJECTS.length - 1 ? "1px solid #f4f4f4" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f4f4f4")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <td
                style={{
                  padding: "0.625rem 1rem",
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "0.8125rem",
                  color: "#525252",
                  whiteSpace: "nowrap",
                }}
              >
                {s.code}
              </td>
              <td style={{ padding: "0.625rem 1rem", fontSize: "0.875rem", color: "#161616" }}>
                <Book
                  size={14}
                  style={{ fill: "#406AAF", marginRight: "0.5rem", verticalAlign: "middle" }}
                />
                {s.name}
              </td>
              <td style={{ padding: "0.625rem 1rem" }}>
                <Tag type={levelColors[s.level] ?? "gray"} size="sm">
                  {s.level}
                </Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Subjects() {
  return (
    <div className="os-page">
      <div
        className="os-page__header"
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <div>
          <h1 className="os-page__title">Subjects</h1>
          <p className="os-page__subtitle">
            Sri Lankan national curriculum — Primary, Lower Secondary, O/L and A/L subject catalogue
          </p>
        </div>
        <Button
          renderIcon={Add}
          kind="primary"
          size="md"
          as={Link}
          to="/subjects/new"
          style={{ backgroundColor: "#406AAF", borderColor: "#406AAF" }}
        >
          Add Subject
        </Button>
      </div>

      <div className="os-section">
        <Tabs>
          <TabList aria-label="Subject grade level tabs">
            <Tab>Primary (1–5)</Tab>
            <Tab>Lower Secondary (6–9)</Tab>
            <Tab>Ordinary Level (10–11)</Tab>
            <Tab>Advanced Level (12–13)</Tab>
            <Tab>All Subjects</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <PrimaryPanel />
            </TabPanel>
            <TabPanel>
              <LowerSecondaryPanel />
            </TabPanel>
            <TabPanel>
              <OrdinaryLevelPanel />
            </TabPanel>
            <TabPanel>
              <AdvancedLevelPanel />
            </TabPanel>
            <TabPanel>
              <AllSubjectsPanel />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  );
}
