const integer = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("en-LK", { maximumFractionDigits: 1 });

export function formatNumber(n: number | null | undefined, fractionDigits: 0 | 1 = 0): string {
  if (n == null || Number.isNaN(n)) return "-";
  return (fractionDigits ? decimal : integer).format(n);
}

// Takes a 0-100 value, which is what the API returns for rates and averages.
export function formatPercent(n: number | null | undefined, fractionDigits: 0 | 1 = 0): string {
  if (n == null || Number.isNaN(n)) return "-";
  return `${formatNumber(n, fractionDigits)}%`;
}
