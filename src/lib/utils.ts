import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format an amount in cents to a localized currency string.
 * E.g. formatCents(1250, 'EUR', 'de') => "12,50 €"
 */
export function formatCents(
  cents: number,
  currency: string = "EUR",
  locale: string = "de"
): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
