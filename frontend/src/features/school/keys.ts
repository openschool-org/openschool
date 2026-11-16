export const schoolKeys = {
  all: ["school"] as const,
  info: () => ["school", "info"] as const,
  branding: () => ["school", "info", "branding"] as const,
  setupStatus: () => ["school", "setup-status"] as const,
  houses: () => ["school", "houses"] as const,
};

export const academicYearKeys = {
  all: ["academic-years"] as const,
  list: () => ["academic-years", "list"] as const,
  current: () => ["academic-years", "current"] as const,
};

export const termKeys = {
  all: ["terms"] as const,
  byYear: (academicYearId: string) => ["terms", "by-year", academicYearId] as const,
  current: () => ["terms", "current"] as const,
};
