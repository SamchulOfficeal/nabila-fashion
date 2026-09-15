import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { useQuery } from "@/services/firebase/hooks";
import {
  BadgeCheck,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Send,
  Truck,
  Undo2,
} from "lucide-react";
import { Link } from "react-router";

const SOCIALS = [
  { Icon: Instagram, label: "Instagram", href: "https://instagram.com/nabilafashion" },
  { Icon: Facebook, label: "Facebook", href: "https://facebook.com/nabilafashion" },
  { Icon: Send, label: "Telegram", href: "https://t.me/nabilafashion" },
];

export function Footer() {
  const { t, locale, storeName, logoUrl, supportPhone } = useShop();
  const categories = useQuery(api.catalog.categories);

  return (
    <footer className="relative mt-24 pb-24 md:pb-0">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass overflow-hidden rounded-[2rem] p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <img src={logoUrl} alt="" className="size-10 rounded-xl object-cover" />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-base font-semibold tracking-tight">
                    {storeName}
                  </span>
                  <span className="text-[9px] font-medium tracking-[0.34em] text-muted-foreground">
                    STUDIO
                  </span>
                </span>
              </div>
              <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">
                {t("footer.tagline")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium">
                  <Truck className="size-3.5 text-primary" strokeWidth={1.8} />
                  {t("checkout.cod")}
                </span>
                <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium">
                  <Undo2 className="size-3.5 text-primary" strokeWidth={1.8} />
                  7-day exchange
                </span>
                <span className="glass-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium">
                  <BadgeCheck className="size-3.5 text-primary" strokeWidth={1.8} />
                  Authentic fabrics
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-[0.2em] uppercase">
                {t("section.categories")}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {(categories ?? []).slice(0, 6).map((category) => (
                  <li key={category._id}>
                    <Link
                      to={`/shop?category=${category.slug}`}
                      className="transition-colors hover:text-primary"
                    >
                      {locale === "bn" && category.nameBn ? category.nameBn : category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-[0.2em] uppercase">
                {t("footer.help")}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link to="/orders" className="transition-colors hover:text-primary">
                    {t("orders.track")}
                  </Link>
                </li>
                <li>
                  <Link to="/legal/refund-policy" className="transition-colors hover:text-primary">
                    Returns &amp; refunds
                  </Link>
                </li>
                <li>
                  <Link to="/account" className="transition-colors hover:text-primary">
                    {t("nav.account")}
                  </Link>
                </li>
                <li>
                  <Link to="/wishlist" className="transition-colors hover:text-primary">
                    {t("nav.wishlist")}
                  </Link>
                </li>
                <li>
                  <Link to="/reseller" className="transition-colors hover:text-primary">
                    Become a reseller
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-[0.2em] uppercase">
                {t("footer.legal")}
              </h4>
              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link to="/legal/privacy-policy" className="transition-colors hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/legal/terms-conditions" className="transition-colors hover:text-primary">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link to="/legal/refund-policy" className="transition-colors hover:text-primary">
                    Refund Policy
                  </Link>
                </li>
              </ul>
              <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5" strokeWidth={1.8} />
                  {supportPhone}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="size-3.5" strokeWidth={1.8} />
                  care@nabilafashion.com
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="size-3.5" strokeWidth={1.8} />
                  Dhanmondi, Dhaka 1209
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border/50 pt-6">
            <span className="mr-2 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              Delivery partners
            </span>
            {['Pathao', 'Steadfast', 'RedX', 'bKash'].map((partner) => (
              <span key={partner} className="glass-soft rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground/70">
                {partner}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} {storeName}. {t("footer.rights")}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("footer.follow")}</span>
              {SOCIALS.map(({ Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="glass-soft grid size-9 place-items-center rounded-full transition-colors hover:text-primary"
                >
                  <Icon className="size-4" strokeWidth={1.6} />
                </a>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground/70">
            Developed by Mehedi
          </p>
        </div>
      </div>
    </footer>
  );
}
