// Every colour the Analytics charts use, as CSS variables so the palette lives in _tokens.scss.
// Categorical slots go in fixed order (1, 2, 3) and are never cycled; status colours stay reserved for attendance states.
export const CHART_1 = "var(--os-chart-1)";
export const CHART_2 = "var(--os-chart-2)";
export const CHART_3 = "var(--os-chart-3)";
export const MUTED = "var(--os-border-strong)";

export const STATUS_COLORS = {
  present: "var(--os-success)",
  late: "var(--os-warning)",
  absent: "var(--os-danger)",
  leave: CHART_3,
};

// Houses normally carry their own colour; these cover a house without one.
export const CATEGORICAL_PALETTE = [CHART_1, CHART_2, CHART_3];

export const GENDER_COLORS: Record<string, string> = {
  Male: CHART_1,
  Female: CHART_2,
  Unspecified: MUTED,
};
