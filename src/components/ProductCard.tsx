import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Doc } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn, discountPercent, timeRemaining } from "@/lib/utils";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Star, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

export function Stars({
  rating,
  size = 13,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          style={{ width: size, height: size }}
          className={cn(
            value <= Math.round(rating)
              ? "fill-brand-champagne text-brand-champagne"
              : "text-muted-foreground/40",
          )}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function livePrice(product: Doc<"products">, now = Date.now()) {
  const isFlash =
    product.flashSalePrice !== undefined &&
    product.flashSaleEndsAt !== undefined &&
    product.flashSaleEndsAt > now;
  if (isFlash) {
    return { price: product.flashSalePrice as number, compareAt: product.price, isFlash };
  }
  return { price: product.price, compareAt: product.compareAtPrice, isFlash: false };
}

export function PriceTag({
  price,
  compareAt,
  className,
  size = "md",
}: {
  price: number;
  compareAt?: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { money } = useShop();
  const sizes = {
    sm: "text-sm font-semibold",
    md: "text-base font-semibold",
    lg: "text-3xl font-semibold",
  } as const;
  return (
    <span className={cn("flex items-baseline gap-2", className)}>
      <span className={cn(sizes[size], "tracking-tight")}>{money(price)}</span>
      {compareAt && compareAt > price && (
        <span
          className={cn(
            "text-muted-foreground line-through",
            size === "lg" ? "text-lg" : "text-xs",
          )}
        >
          {money(compareAt)}
        </span>
      )}
    </span>
  );
}

export function FlashCountdown({
  endsAt,
  className,
}: {
  endsAt: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const left = timeRemaining(endsAt, now);
  if (!left) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium tabular-nums",
        className,
      )}
    >
      <Timer className="size-3.5" strokeWidth={1.8} />
      {String(left.hours).padStart(2, "0")}:
      {String(left.minutes).padStart(2, "0")}:
      {String(left.seconds).padStart(2, "0")}
    </span>
  );
}

export function ProductCard({
  product,
  index = 0,
  className,
}: {
  product: Doc<"products">;
  index?: number;
  className?: string;
}) {
  const { t } = useShop();
  const { add } = useCart();
  const { isSaved, toggle } = useWishlist();

  const { price, compareAt, isFlash } = livePrice(product);
  const off = discountPercent(price, compareAt);
  const saved = isSaved(product._id);
  const soldOut = product.stock <= 0;
  const [renderTime] = useState(() => Date.now());
  const isNew = renderTime - product.createdAt < 21 * 24 * 60 * 60 * 1000;
  const hoverImage = product.images[1] ?? product.images[0];

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative h-full", className)}
    >
      <div className="glass lift relative flex h-full flex-col overflow-hidden rounded-3xl p-2.5">
        <div className="relative">
          <Link to={`/product/${product.slug}`} className="block">
            <SmartImage
              src={product.images[0]}
              alt={product.name}
              width={700}
              className="aspect-[4/5] rounded-2xl"
              imageClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 group-hover:opacity-0"
            />
            {product.images[1] && (
              <SmartImage
                src={hoverImage}
                alt=""
                width={700}
                className="pointer-events-none absolute inset-0 aspect-[4/5] rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                imageClassName="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
              />
            )}
          </Link>

          <div className="pointer-events-none absolute top-3 left-3 flex flex-col items-start gap-1.5">
            {isFlash && off > 0 && (
              <Badge className="rounded-full border-transparent bg-primary text-[10px] font-semibold tracking-wide text-primary-foreground uppercase">
                {off}% {t("common.off")}
              </Badge>
            )}
            {!isFlash && isNew && (
              <Badge
                variant="outline"
                className="glass-strong rounded-full border-transparent text-[10px] font-semibold tracking-wide uppercase"
              >
                {t("common.new")}
              </Badge>
            )}
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void toggle(product._id);
            }}
            aria-label={t("nav.wishlist")}
            className="glass-strong absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full transition-transform duration-300 hover:scale-110"
          >
            <Heart
              className={cn(
                "size-4 transition-colors",
                saved ? "fill-primary text-primary" : "text-foreground/70",
              )}
              strokeWidth={1.8}
            />
          </button>

          {soldOut && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-background/55 backdrop-blur-[2px]">
              <span className="glass-strong rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase">
                {t("product.outOfStock")}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col px-2 pt-3 pb-1">
          <Link to={`/product/${product.slug}`} className="block">
            <p className="line-clamp-1 text-[10px] font-medium tracking-[0.18em] text-primary uppercase">
              {product.categorySlug.replace(/-/g, " ")}
            </p>
            {/* Two lines are always reserved so every card's rows stay aligned. */}
            <h3 className="mt-1.5 line-clamp-2 min-h-[2.75em] font-display text-[15px] leading-snug font-semibold tracking-tight">
              {product.name}
            </h3>
          </Link>

          <div className="mt-2 flex items-center gap-2">
            <Stars rating={product.rating || 0} />
            <span className="text-[11px] text-muted-foreground">
              {product.reviewCount > 0 ? `(${product.reviewCount})` : t("common.new")}
            </span>
          </div>

          <div className="mt-2.5 flex min-h-[2.75rem] items-end justify-between gap-2">
            <PriceTag price={price} compareAt={compareAt} />
            {isFlash && product.flashSaleEndsAt && (
              <FlashCountdown
                endsAt={product.flashSaleEndsAt}
                className="text-[11px] text-primary"
              />
            )}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-3">
            {/* Live availability straight from inventory, never a stale estimate. */}
            <span
              className={cn(
                "text-[11px] font-medium",
                soldOut
                  ? "text-destructive"
                  : product.stock <= 3
                    ? "text-primary"
                    : "text-muted-foreground",
              )}
            >
              {soldOut
                ? t("product.outOfStock")
                : product.stock <= 3
                  ? `${t("product.lowStock")} · ${product.stock}`
                  : `${t("product.inStock")} · ${product.stock}`}
            </span>
            <Button
              size="sm"
              disabled={soldOut}
              onClick={() => void add(product._id)}
              className="h-9 shrink-0 cursor-pointer gap-1.5 rounded-full px-3.5 text-xs font-medium"
            >
              <ShoppingBag className="size-3.5" strokeWidth={1.8} />
              {t("product.addToBag")}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
