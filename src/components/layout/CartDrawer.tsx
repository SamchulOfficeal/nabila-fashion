import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useShop } from "@/context/app-context";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";
import { Loader2, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useNavigate } from "react-router";

export function CartDrawer() {
  const { t, money, freeDeliveryThreshold } = useShop();
  const { items, subtotal, isLoading, count, updateQuantity, remove } = useCart();
  const cartOpen = useUiStore((state) => state.cartOpen);
  const setCartOpen = useUiStore((state) => state.setCartOpen);
  const navigate = useNavigate();

  const remaining = Math.max(0, freeDeliveryThreshold - subtotal);
  const progress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent
        side="right"
        className="glass-strong flex w-full flex-col gap-0 border-l border-border/40 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border/40 pb-4">
          <SheetTitle className="flex items-center gap-2 font-display text-lg">
            <ShoppingBag className="size-4 text-primary" strokeWidth={1.8} />
            {t("bag.title")}
            <span className="text-sm font-normal text-muted-foreground">({count})</span>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="grid flex-1 place-items-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
              <ShoppingBag className="size-7" strokeWidth={1.5} />
            </span>
            <div>
              <p className="font-display text-lg font-semibold">{t("bag.empty")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("bag.emptyHint")}</p>
            </div>
            <Button
              className="cursor-pointer rounded-full px-6"
              onClick={() => {
                setCartOpen(false);
                navigate("/shop");
              }}
            >
              {t("cta.shopNow")}
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-border/40 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="size-3.5 text-primary" strokeWidth={1.8} />
                {remaining > 0 ? (
                  <span>
                    {money(remaining)} away from <strong>{t("common.free")}</strong> delivery
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

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {items.map((line) => (
                <div key={line._id} className="glass-soft flex gap-3 rounded-2xl p-2.5">
                  <SmartImage
                    src={line.product.images[0]}
                    alt={line.product.name}
                    width={160}
                    className="size-20 shrink-0 rounded-xl"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="line-clamp-2 text-sm font-medium">{line.product.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {[line.size, line.color].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div className="glass-soft flex items-center gap-1 rounded-full p-0.5">
                        <button
                          type="button"
                          aria-label="Decrease"
                          onClick={() => void updateQuantity(line._id, line.quantity - 1)}
                          className="grid size-6 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent"
                        >
                          <Minus className="size-3" strokeWidth={2} />
                        </button>
                        <span className="w-6 text-center text-xs font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase"
                          disabled={line.quantity >= line.product.stock}
                          onClick={() => void updateQuantity(line._id, line.quantity + 1)}
                          className="grid size-6 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent disabled:opacity-40"
                        >
                          <Plus className="size-3" strokeWidth={2} />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        {money(
                          (line.product.flashSalePrice &&
                          line.product.flashSaleEndsAt &&
                          line.product.flashSaleEndsAt > Date.now()
                            ? line.product.flashSalePrice
                            : line.product.price) * line.quantity,
                        )}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={t("bag.remove")}
                    onClick={() => void remove(line._id)}
                    className="self-start cursor-pointer text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.7} />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-border/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("bag.subtotal")}</span>
                <span className="font-display text-lg font-semibold">{money(subtotal)}</span>
              </div>
              <Button
                className="h-12 w-full cursor-pointer rounded-full text-sm font-medium"
                onClick={() => {
                  setCartOpen(false);
                  navigate("/checkout");
                }}
              >
                {t("bag.checkout")}
              </Button>
              <Button
                variant="ghost"
                className="w-full cursor-pointer rounded-full text-sm"
                onClick={() => {
                  setCartOpen(false);
                  navigate("/cart");
                }}
              >
                {t("bag.viewBag")}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
