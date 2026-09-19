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
  paymentCodEnabled: boolean;
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
    paymentCodEnabled?: boolean | string;
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
  const logoUrl = config?.logoUrl ?? "/auravelle-mark.svg";

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  /**
   * Favicon follows the admin-configured logo: the store's mark shows up in
   * browser tabs, bookmarks and phone home-screens without a redeploy.
   * SVG/PNG/webp are fine inline; we only re-point the existing link tags.
   */
  useEffect(() => {
    if (!logoUrl || logoUrl.startsWith("data:")) return;
    const favicon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = logoUrl;
    const touchIcon = document.head.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (touchIcon) touchIcon.href = logoUrl;
    // Raster-only environments can't render SVG icons; add a PNG fallback link
    // whenever the admin logo is a raster image.
    if (/\.(png|jpe?g|webp)(\?|$)/i.test(logoUrl)) {
      let fallback = document.head.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/png"]');
      if (!fallback) {
        fallback = document.createElement("link");
        fallback.rel = "icon";
        fallback.type = "image/png";
        document.head.appendChild(fallback);
      }
      fallback.href = logoUrl;
    }
  }, [logoUrl]);

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
      storeName: config?.storeName ?? "NABILA FASHION",
      logoUrl,
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
      paymentCodEnabled: config?.paymentCodEnabled !== false && config?.paymentCodEnabled !== "false",
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
