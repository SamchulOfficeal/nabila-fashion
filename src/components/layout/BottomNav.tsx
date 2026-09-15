import { useShop } from "@/context/app-context";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { Heart, Home, LayoutGrid, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "react-router";

export function BottomNav() {
  const { t } = useShop();
  const { count: bagCount } = useCart();
  const { count: wishCount } = useWishlist();
  const location = useLocation();
  const setCartOpen = useUiStore((state) => state.setCartOpen);

  const items: {
    key: string;
    label: string;
    to: string;
    icon: typeof Home;
    badge?: number;
    opensBag?: boolean;
  }[] = [
    { key: "home", label: t("nav.home"), to: "/", icon: Home },
    { key: "shop", label: t("nav.shop"), to: "/shop", icon: LayoutGrid },
    {
      key: "bag",
      label: t("nav.bag"),
      to: "/cart",
      icon: ShoppingBag,
      badge: bagCount,
      opensBag: true,
    },
    {
      key: "wishlist",
      label: t("nav.wishlist"),
      to: "/wishlist",
      icon: Heart,
      badge: wishCount,
    },
    { key: "account", label: t("nav.account"), to: "/account", icon: User },
  ];

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="glass-strong mx-3 mb-2 flex items-center justify-around rounded-3xl px-1 pt-1.5 pb-safe">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          const content = (
            <>
              <span className="relative">
                <Icon
                  className={cn("size-5", active ? "text-primary" : "text-foreground/70")}
                  strokeWidth={active ? 2 : 1.7}
                />
                {(item.badge ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[9px] font-medium tracking-wide",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </>
          );

          if (item.opensBag) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCartOpen(true)}
                className="flex flex-1 cursor-pointer flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.key}
              to={item.to}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
