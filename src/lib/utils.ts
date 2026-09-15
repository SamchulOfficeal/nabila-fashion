import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Currency = "BDT" | "USD";

/** Prices are always stored in BDT; USD is a presentation-only conversion. */
export function convert(amountBdt: number, currency: Currency, usdRate: number) {
  if (currency === "USD") {
    return amountBdt / (usdRate || 120);
  }
  return amountBdt;
}

export function formatMoney(
  amountBdt: number,
  currency: Currency = "BDT",
  usdRate = 120,
) {
  const value = convert(amountBdt, currency, usdRate);
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `৳${Math.round(value).toLocaleString("en-US")}`;
}

export function formatCompact(amount: number, currency: Currency = "BDT", usdRate = 120) {
  const value = convert(amount, currency, usdRate);
  if (currency === "USD") {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  }
  if (value >= 100000) return `৳${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `৳${(value / 1000).toFixed(1)}k`;
  return `৳${Math.round(value)}`;
}

export function formatDate(timestamp: number, locale: string = "en-GB") {
  return new Date(timestamp).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(timestamp: number, locale: string = "en-GB") {
  return new Date(timestamp).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Percentage saved versus the struck-through compare-at price. */
export function discountPercent(price: number, compareAt?: number) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

export function timeRemaining(target: number, now = Date.now()) {
  const diff = target - now;
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { hours, minutes, seconds };
}
