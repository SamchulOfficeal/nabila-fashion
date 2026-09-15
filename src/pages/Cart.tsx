import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { useShop } from "@/context/app-context";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import {
  ArrowRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function Cart() {
  const { t, money, freeDeliveryThreshold } = useShop();
  const { items, subtotal, count, isLoading, updateQuantity, remove } = useCart();
  const { toggle } = useWishlist();
  const setCartOpen = useUiStore((state) => state.setCartOpen);
  const navigate = useNavigate();

  const remaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo title="Your bag" description="Review the pieces in your NABILA FASHION bag." />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
            Step 1 of 2
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("bag.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {count} {count === 1 ? "piece" : "pieces"} reserved for the next 30 minutes.
          </p>
        </div>
        <Button
          variant="ghost"
          asChild
          className="w-fit cursor-pointer rounded-full text-sm"
        >
          <Link to="/shop">{t("bag.continueShopping")}</Link>
        </Button>
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass mt-8 grid place-items-center gap-4 rounded-[2rem] px-6 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
            <ShoppingBag className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-display text-xl font-semibold">{t("bag.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("bag.emptyHint")}</p>
          </div>
          <Button
            onClick={() => navigate("/shop")}
            className="cursor-pointer rounded-full px-6"
          >
            {t("cta.shopNow")}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-3">
            {items.map((line) => (
              <div
                key={line._id}
                className="glass flex flex-col gap-4 rounded-3xl p-3.5 sm:flex-row"
              >
                <Link to={`/product/${line.product.slug}`} className="shrink-0">
                  <SmartImage
                    src={line.product.images[0]}
                    alt={line.product.name}
                    width={280}
                    className="h-40 w-full rounded-2xl sm:size-28"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/product/${line.product.slug}`}
                        className="line-clamp-2 font-display text-base font-semibold tracking-tight hover:text-primary"
                      >
                        {line.product.name}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[line.size && `${t("product.size")} ${line.size}`, line.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs",
                          line.product.stock <= 3 || line.quantity > line.product.stock
                            ? "font-medium text-primary"
                            : "text-muted-foreground",
                        )}
                      >
                        {line.product.stock <= 3
                          ? `${t("product.lowStock")} · ${line.product.stock}`
                          : `${t("product.inStock")} · ${line.product.stock}`}
                      </p>
                      {line.quantity > line.product.stock && (
                        <p className="mt-1 text-[11px] font-medium text-destructive">
                          Only {line.product.stock} left — lower the quantity to check
                          out.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={t("bag.remove")}
                      onClick={() => void remove(line._id)}
                      className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" strokeWidth={1.7} />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <div className="flex items-center gap-2">
                      <div className="glass-soft flex items-center gap-1 rounded-full p-1">
                        <button
                          type="button"
                          aria-label="Decrease"
                          onClick={() => void updateQuantity(line._id, line.quantity - 1)}
                          className="grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent"
                        >
                          <Minus className="size-3.5" strokeWidth={2} />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase"
                          disabled={line.quantity >= line.product.stock}
                          onClick={() => void updateQuantity(line._id, line.quantity + 1)}
                          className="grid size-7 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent disabled:opacity-40"
                        >
                          <Plus className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void toggle(line.product._id)}
                        className="glass-soft flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors hover:text-primary"
                      >
                        <Heart className="size-3.5" strokeWidth={1.8} />
                        {t("nav.wishlist")}
                      </button>
                    </div>
                    <span className="font-display text-lg font-semibold">
                      {money(
                        (line.product.flashSalePrice &&
                        line.product.flashSaleEndsAt &&
                        line.product.flashSaleEndsAt > Date.now()
                          ? line.product.flashSalePrice
                          : line.product.price) * line.quantity,
                      )}
                      {line.quantity > 1 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (
                          {money(
                            line.product.flashSalePrice &&
                              line.product.flashSaleEndsAt &&
                              line.product.flashSaleEndsAt > Date.now()
                              ? line.product.flashSalePrice
                              : line.product.price,
                          )}{" "}
                          each)
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="glass rounded-3xl p-5">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {t("checkout.summary")}
              </h2>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("bag.subtotal")}</span>
                  <span className="font-medium">{money(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("bag.delivery")}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("checkout.detect")} at checkout
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-border/50 pt-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="size-3.5 text-primary" strokeWidth={1.8} />
                  {remaining > 0 ? (
                    <span>
                      {money(remaining)} away from <strong>{t("common.free")}</strong>{" "}
                      delivery
                    </span>
                  ) : (
                    <span className="font-medium text-primary">
                      {t("checkout.freeDelivery")}
                    </span>
                  )}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-gradient-to-r from-primary to-brand-champagne transition-all duration-700",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("bag.total")}</span>
                <span className="font-display text-2xl font-semibold">{money(subtotal)}</span>
              </div>

              <Button
                className="mt-5 h-12 w-full cursor-pointer rounded-full text-sm font-medium"
                onClick={() => {
                  setCartOpen(false);
                  navigate("/checkout");
                }}
              >
                {t("bag.checkout")}
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Button>

              <div className="mt-4 space-y-2 text-[11px] text-muted-foreground">
                <p>{t("checkout.codHint")}</p>
                <p>7-day exchange on unworn pieces with tags.</p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
