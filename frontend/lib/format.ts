// Demo-only fixed rate -- not a live FX feed. Override via
// NEXT_PUBLIC_TWD_PER_USD if a different reference rate is wanted.
const TWD_PER_USD = Number(process.env.NEXT_PUBLIC_TWD_PER_USD) || 32;

// currencyDisplay: "code" prints the ISO unit ("TWD"/"USD") instead of a
// bare symbol ("NT$"/"$") -- the symbols alone don't make the unit obvious
// once both currencies are shown side by side.
export function formatTWD(amount: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amountTWD: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amountTWD / TWD_PER_USD);
}

export function formatTWDT(amount: number): string {
  const twdt = `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(amount)} TWDT`;
  return `${twdt}（≈ ${formatUSD(amount)}）`;
}

export function formatCompactNumber(amount: number): string {
  return new Intl.NumberFormat("zh-TW", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function progressPercent(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}

export function fundedPercent(raised: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.round((raised / goal) * 100);
}

export function daysRemaining(deadline: string): number {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}
