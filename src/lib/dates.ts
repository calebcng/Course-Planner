const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function monthName(month: number): string {
  return MONTHS[Math.min(12, Math.max(1, month)) - 1] ?? String(month);
}

export function monthRangeLabel(startMonth: number, endMonth: number): string {
  return `${monthName(startMonth)}–${monthName(endMonth)}`;
}

export const MONTH_OPTIONS = MONTHS.map((label, index) => ({
  value: index + 1,
  label,
}));
