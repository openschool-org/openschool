export const leaveKeys = {
  all: ["leave"] as const,
  mine: (year: number) => ["leave", "me", year] as const,
  myBalance: (year: number) => ["leave", "me", "balance", year] as const,
  myReliefDuties: () => ["leave", "me", "relief-duties"] as const,
  periods: (params: object) => ["leave", "me", "periods", params] as const,
  candidates: (date: string, period: number) => ["leave", "relief-candidates", date, period] as const,
  register: (params: object) => ["leave", "register", params] as const,
  detail: (id: string) => ["leave", "detail", id] as const,
  balances: (params: object) => ["leave", "balances", params] as const,
  dailyRelief: (date: string) => ["leave", "relief", date] as const,
};
