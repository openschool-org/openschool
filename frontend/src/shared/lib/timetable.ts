// School week for rendering a published timetable grouped by day.
export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];

// "13:30" or "13:30:00" to ["01.30", "p.m."], the way Sri Lankan school timetables print times.
function twelveHour(value: string): [string, string] {
  const [h, m] = value.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return [`${String(hour).padStart(2, "0")}.${String(m).padStart(2, "0")}`, h < 12 ? "a.m." : "p.m."];
}

// "07.50-08.30 a.m.", or "11.30 a.m.-12.10 p.m." when the slot crosses noon.
export function formatTimeRange(start: string, end: string): string {
  const [from, fromPart] = twelveHour(start);
  const [to, toPart] = twelveHour(end);
  return fromPart === toPart ? `${from}-${to} ${toPart}` : `${from} ${fromPart}-${to} ${toPart}`;
}
