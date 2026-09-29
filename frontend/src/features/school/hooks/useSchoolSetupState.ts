import { useState } from "react";
import { EMAIL_RE } from "@/shared/lib/validation";
import { isValidSriLankanPhone } from "@/shared/lib/phone";
import type { HouseRow } from "@/features/school/components/setup/HousesStep";
import { AL_GRADE_NUMBERS, createDefaultAlStreams, DEFAULT_CLASS_CAPACITY, GRADE_MIN, GRADE_MAX, HOUSE_COLOR_PALETTE, SUGGESTED_MEDIUMS, type AlStreamsByGradeState, type FacilityRoom } from "@/features/school/setupConstants";

// All form state for the onboarding wizard, so the page only handles step navigation.
export function useSchoolSetupState() {
  const [school, setSchool] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    logo_url: "",
    school_type: "mixed" as "boys" | "girls" | "mixed",
    grade_from: GRADE_MIN as number | "",
    grade_to: GRADE_MAX as number | "",
  });
  const [schoolTouched, setSchoolTouched] = useState(false);

  const gradeValuesInvalid =
    school.grade_from === "" || school.grade_to === "" ||
    Number(school.grade_from) < GRADE_MIN || Number(school.grade_from) > GRADE_MAX ||
    Number(school.grade_to) < GRADE_MIN || Number(school.grade_to) > GRADE_MAX;
  const gradeRangeInvalid = gradeValuesInvalid || (
    school.grade_from !== "" && school.grade_to !== "" && Number(school.grade_to) < Number(school.grade_from)
  );
  const schoolValid =
    school.name.trim().length > 0 &&
    isValidSriLankanPhone(school.phone) &&
    school.phone.trim().length > 0 &&
    EMAIL_RE.test(school.email.trim()) &&
    school.address.trim().length > 0 &&
    !gradeRangeInvalid;

  const [houses, setHouses] = useState<HouseRow[]>([{ name: "", code: "", color: HOUSE_COLOR_PALETTE[0] }]);
  const [housesSkipped, setHousesSkipped] = useState(false);

  const gradeRangeStart = school.grade_from === "" ? GRADE_MIN : Number(school.grade_from);
  const gradeRangeEnd = school.grade_to === "" ? GRADE_MAX : Number(school.grade_to);
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(new Set());
  const [syncedRange, setSyncedRange] = useState<[number, number] | null>(null);

  // Re-select every grade whenever the range changes on the school step.
  if (school.grade_from !== "" && school.grade_to !== "" && (syncedRange === null || syncedRange[0] !== gradeRangeStart || syncedRange[1] !== gradeRangeEnd)) {
    setSyncedRange([gradeRangeStart, gradeRangeEnd]);
    const all = new Set<number>();
    for (let n = gradeRangeStart; n <= gradeRangeEnd; n++) all.add(n);
    setSelectedGrades(all);
  }

  const orderedSelectedGrades = [...selectedGrades].sort((a, b) => a - b);

  const [mediumChecks, setMediumChecks] = useState<Record<string, boolean>>({ Sinhala: true, Tamil: false, English: true });
  const [customMediums, setCustomMediums] = useState<string[]>([]);
  const [mediumsSkipped, setMediumsSkipped] = useState(false);
  const selectedMediumNames = mediumsSkipped ? [] : [...SUGGESTED_MEDIUMS.filter((m) => mediumChecks[m]), ...customMediums.filter((m) => m.trim())];

  const [yearLabel, setYearLabel] = useState(String(new Date().getFullYear()));
  const [classCapacity, setClassCapacity] = useState(DEFAULT_CLASS_CAPACITY);
  const [sectionsPerGrade, setSectionsPerGrade] = useState<Record<number, number>>({});
  const [classesSkipped, setClassesSkipped] = useState(false);
  const [sectionMediums, setSectionMediums] = useState<Record<string, string>>({});
  const [alStreams, setAlStreams] = useState<AlStreamsByGradeState>(() => ({ 12: createDefaultAlStreams(), 13: createDefaultAlStreams() }));

  const [facilityRooms, setFacilityRooms] = useState<FacilityRoom[]>([]);
  const [roomsSkipped, setRoomsSkipped] = useState(false);

  return {
    school, setSchool, schoolTouched, setSchoolTouched, schoolValid, gradeRangeInvalid,
    houses, setHouses, housesSkipped, setHousesSkipped,
    gradeRangeStart, gradeRangeEnd, selectedGrades, setSelectedGrades, orderedSelectedGrades,
    regularGradeNumbers: orderedSelectedGrades.filter((n) => !AL_GRADE_NUMBERS.has(n)),
    alGradeNumbers: orderedSelectedGrades.filter((n) => AL_GRADE_NUMBERS.has(n)),
    mediumChecks, setMediumChecks, customMediums, setCustomMediums, mediumsSkipped, setMediumsSkipped, selectedMediumNames,
    yearLabel, setYearLabel, classCapacity, setClassCapacity, sectionsPerGrade, setSectionsPerGrade, classesSkipped, setClassesSkipped, sectionMediums, setSectionMediums, alStreams, setAlStreams,
    facilityRooms, setFacilityRooms, roomsSkipped, setRoomsSkipped,
  };
}
