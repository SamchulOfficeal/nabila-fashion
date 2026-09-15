import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Currency } from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

type UiState = {
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  currency: Currency;
  locale: Locale;
  theme: "light" | "dark";
  recentSlugs: string[];
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setCurrency: (currency: Currency) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
  pushRecent: (slug: string) => void;
  clearRecent: () => void;
};

function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  return navigator.language.toLowerCase().startsWith("bn") ? "bn" : "en";
}

function detectCurrency(): Currency {
  if (typeof Intl === "undefined") return "BDT";
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    const offset = -new Date().getTimezoneOffset();
    // Asia/Dhaka (UTC+6) shoppers default to BDT.
    if (zone.includes("Dhaka") || zone.includes("Asia/Calcutta")) return "BDT";
    return offset === 360 ? "BDT" : "USD";
  } catch {
    return "BDT";
  }
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      cartOpen: false,
      searchOpen: false,
      menuOpen: false,
      currency: detectCurrency(),
      locale: detectLocale(),
      theme: "light",
      recentSlugs: [],
      setCartOpen: (cartOpen) => set({ cartOpen, menuOpen: false }),
      setSearchOpen: (searchOpen) => set({ searchOpen }),
      setMenuOpen: (menuOpen) => set({ menuOpen }),
      setCurrency: (currency) => set({ currency }),
      setLocale: (locale) => set({ locale }),
      toggleTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
      pushRecent: (slug) =>
        set({
          recentSlugs: [slug, ...get().recentSlugs.filter((item) => item !== slug)].slice(
            0,
            8,
          ),
        }),
      clearRecent: () => set({ recentSlugs: [] }),
    }),
    { name: "nabila-shop-ui" },
  ),
);
