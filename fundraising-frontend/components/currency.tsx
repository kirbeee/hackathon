"use client";

import { useEffect, useSyncExternalStore } from "react";
import { formatTWD, formatUSD } from "@/lib/format";

export type CurrencyPreference = "TWD" | "USD";

const STORAGE_KEY = "rwa-currency-preference";
let preference: CurrencyPreference = "TWD";
const listeners = new Set<() => void>();

function readStorage(): CurrencyPreference {
  try {
    return localStorage.getItem(STORAGE_KEY) === "USD" ? "USD" : "TWD";
  } catch {
    return "TWD";
  }
}

export function setCurrencyPreference(next: CurrencyPreference) {
  preference = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Non-fatal -- the choice just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CurrencyPreference {
  return preference;
}

function getServerSnapshot(): CurrencyPreference {
  return "TWD";
}

/**
 * The site-wide preferred display currency, picked via <CurrencySwitcher>
 * and persisted to localStorage. A plain module-level store (not React
 * context) so any client component anywhere in the tree can read it without
 * needing a provider wrapping it -- see <Amount> below for the common case.
 */
export function useCurrencyPreference(): CurrencyPreference {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Only trust localStorage after mount, same reasoning as the Solana network
 * switcher in app/providers.tsx: the server always renders "TWD" first, so
 * reading storage during render would let the server and first client
 * render disagree and trigger a hydration mismatch.
 */
function useHydrateCurrencyPreference() {
  useEffect(() => {
    const stored = readStorage();
    if (stored !== preference) {
      preference = stored;
      listeners.forEach((listener) => listener());
    }
  }, []);
}

/** A TWD amount, formatted with the preferred currency first and the other as a check. */
export function Amount({
  amountTWD,
  unit = "元",
}: {
  amountTWD: number;
  unit?: "元" | "TWDT";
}) {
  useHydrateCurrencyPreference();
  const preferred = useCurrencyPreference();
  const twd = unit === "TWDT" ? formatTWDTAmount(amountTWD) : formatTWD(amountTWD);
  const usd = formatUSD(amountTWD);
  const [primary, secondary] = preferred === "USD" ? [usd, twd] : [twd, usd];
  return (
    <>
      {primary}（≈ {secondary}）
    </>
  );
}

function formatTWDTAmount(amount: number): string {
  return `${new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 0 }).format(amount)} TWDT`;
}

const OPTIONS: CurrencyPreference[] = ["TWD", "USD"];

/** Header toggle for the site-wide currency preference used by <Amount>. */
export function CurrencySwitcher() {
  useHydrateCurrencyPreference();
  const preferred = useCurrencyPreference();

  return (
    <div className="flex rounded-full border border-border p-0.5 text-xs font-medium">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setCurrencyPreference(option)}
          className={`rounded-full px-2.5 py-1 transition ${
            preferred === option
              ? "bg-brand text-white"
              : "text-foreground/60 hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
