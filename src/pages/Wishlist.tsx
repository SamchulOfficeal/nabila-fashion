import { ProductCard } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useShop } from "@/context/app-context";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { Heart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

export default function Wishlist() {
  const { t, storeName } = useShop();
  const { items, isLoading, remove } = useWishlist();
  const { add } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const moveAllToBag = async () => {
    setBusy(true);
    for (const line of items) {
      await add(line.product._id, { silent: true });
    }
    setBusy(false);
    navigate("/cart");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo title="Your wishlist" description={`Pieces you have saved at ${storeName}.`} />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
            Saved for later
          </span>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("wishlist.title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "piece" : "pieces"} saved
          </p>
        </div>
        {items.length > 0 && (
          <Button
            onClick={() => void moveAllToBag()}
            disabled={busy}
            className="w-fit cursor-pointer rounded-full px-6"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("wishlist.addAll")}
          </Button>
        )}
      </header>

      {isLoading ? (
        <div className="grid place-items-center py-32">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass mt-8 grid place-items-center gap-4 rounded-[2rem] px-6 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
            <Heart className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-display text-xl font-semibold">{t("wishlist.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("wishlist.emptyHint")}
            </p>
          </div>
          <Button
            onClick={() => navigate("/shop")}
            className="cursor-pointer rounded-full px-6"
          >
            {t("cta.shopNow")}
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((line, index) => (
            <div key={line._id} className="flex flex-col gap-2">
              <ProductCard product={line.product} index={index} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void remove(line._id)}
                className="cursor-pointer rounded-full text-xs text-muted-foreground hover:text-destructive"
              >
                {t("bag.remove")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
