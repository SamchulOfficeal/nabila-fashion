import { api } from "@/services/firebase/api";
import { translate, type Locale, type TranslationKey } from "@/lib/i18n";
import { formatMoney, type Currency } from "@/lib/utils";
import { useQuery } from "@/services/firebase/hooks";
import { useUiStore } from "@/store/ui-store";
import { useEffect, useMemo, type ReactNode, createContext, useContext } from "react";

/** Theme, language and currency context. Auth state lives in `useAuth`. */
type ShopContextValue = {
  currency: Currency;
  locale: Locale;
  usdRate: number;
  setCurrency: (currency: Currency) => void;
  setLocale: (locale: Locale) => void;
  toggleCurrency: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  t: (key: TranslationKey) => string;
  money: (amountBdt: number) => string;
  storeName: string;
  logoUrl: string;
  announcement: string;
  supportPhone: string;
  whatsappNumber: string;
  chatEnabled: boolean;
  chatGreeting: string;
  freeDeliveryThreshold: number;
  paymentBkashEnabled: boolean;
  paymentBkashNumber: string;
  paymentNagadEnabled: boolean;
  paymentNagadNumber: string;
};

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const config = useQuery<{
    usdRate?: number;
    storeName?: string;
    logoUrl?: string;
    announcement?: string;
    supportPhone?: string;
    whatsappNumber?: string;
    chatEnabled?: boolean | string;
    chatGreeting?: string;
    freeDeliveryThreshold?: number;
    paymentBkashEnabled?: boolean | string;
    paymentBkashNumber?: string;
    paymentNagadEnabled?: boolean | string;
    paymentNagadNumber?: string;
  }>(api.settings.publicConfig);

  const currency = useUiStore((state) => state.currency);
  const locale = useUiStore((state) => state.locale);
  const theme = useUiStore((state) => state.theme);
  const setCurrency = useUiStore((state) => state.setCurrency);
  const setLocale = useUiStore((state) => state.setLocale);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  const usdRate = config?.usdRate ?? 120;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<ShopContextValue>(
    () => ({
      currency,
      locale,
      usdRate,
      setCurrency,
      setLocale,
      toggleCurrency: () => setCurrency(currency === "BDT" ? "USD" : "BDT"),
      theme,
      toggleTheme,
      t: (key: TranslationKey) => translate(locale, key),
      money: (amountBdt: number) => formatMoney(amountBdt, currency, usdRate),
      storeName: config?.storeName ?? "AURAVELLE",
      logoUrl: config?.logoUrl ?? "/auravelle-mark.svg",
      announcement: config?.announcement ?? "",
      supportPhone: config?.supportPhone ?? "+8801700000000",
      whatsappNumber: config?.whatsappNumber ?? config?.supportPhone ?? "+8801700000000",
      chatEnabled: config?.chatEnabled !== false && config?.chatEnabled !== "false",
      chatGreeting: config?.chatGreeting ?? "Hello! How can we help you today?",
      freeDeliveryThreshold: config?.freeDeliveryThreshold ?? 4000,
      paymentBkashEnabled: config?.paymentBkashEnabled === true || config?.paymentBkashEnabled === "true",
      paymentBkashNumber: config?.paymentBkashNumber ?? "",
      paymentNagadEnabled: config?.paymentNagadEnabled === true || config?.paymentNagadEnabled === "true",
      paymentNagadNumber: config?.paymentNagadNumber ?? "",
    }),
    [config, currency, locale, theme, setCurrency, setLocale, toggleTheme, usdRate],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used inside a ShopProvider");
  }
  return context;
}
