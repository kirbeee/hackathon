import type { PaymentCurrency } from "./types";

export const TWD_PER_USDC = 30;
export const RWA_PRICE_TWD = TWD_PER_USDC;
export const MAX_PAYMENT_TWD = 30_000;

/** Demo purchases use whole units: 1 USDC (30 TWD) buys 1 RWA. */
export function rwaAmountForPayment(amount: number, currency: PaymentCurrency): number | null {
  const units = currency === "USDC" ? amount : amount / TWD_PER_USDC;
  return Number.isSafeInteger(units) && units >= 1 && units * RWA_PRICE_TWD <= MAX_PAYMENT_TWD
    ? units
    : null;
}
