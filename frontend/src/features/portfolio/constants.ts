import type { PrefectRank } from "@/features/portfolio/api/prefect";

export const PREFECT_RANKS: { value: PrefectRank; label: string }[] = [
  { value: "head", label: "Head prefects" },
  { value: "deputy_head", label: "Deputy head prefects" },
  { value: "senior", label: "Senior prefects" },
  { value: "junior", label: "Junior prefects" },
  { value: "house_captain", label: "House captains" },
  { value: "vice_house_captain", label: "Vice house captains" },
];
