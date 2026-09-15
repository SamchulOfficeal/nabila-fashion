import { livePrice, PriceTag, ProductCard, Stars } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/firebase/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn, discountPercent, formatDate } from "@/lib/utils";
import { optimizedImage } from "@/services/cloudinary";
import { useUiStore } from "@/store/ui-store";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  Zap,
  ZoomIn,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function ProductDetail() {
  const { slug = "" } = useParams();
  const { t, money, locale } = useShop();
  const { add } = useCart();
  const { isSaved, toggle } = useWishlist();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pushRecent = useUiStore((state) => state.pushRecent);

  const product = useQuery(api.catalog.bySlug, { slug });
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState<"add" | "buy" | null>(null);

  const reviews = useQuery(
    api.reviews.forProduct,
    product ? { productId: product._id } : "skip",
  );
  const canReview = useQuery(
    api.reviews.canReview,
    product && isAuthenticated ? { productId: product._id } : "skip",
  );
  const related = useQuery(
    api.catalog.related,
    product ? { categorySlug: product.categorySlug, excludeId: product._id } : "skip",
  );

  useEffect(() => {
    if (!product) return;
    const frame = window.requestAnimationFrame(() => {
      setSize(product.sizes[0] ?? "");
      setColor(product.colors[0] ?? "");
      setQuantity(1);
      pushRecent(product.slug);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [product, pushRecent]);

  const { price, compareAt, isFlash } = useMemo(
    () => (product ? livePrice(product) : { price: 0, compareAt: undefined, isFlash: false }),
    [product],
  );

  if (product === undefined) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4 text-center">
        <div className="glass w-full rounded-3xl p-8">
          <h1 className="font-display text-2xl font-semibold">
            This piece is no longer available
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It may have sold out or been retired from the collection.
          </p>
          <Button asChild className="mt-6 cursor-pointer rounded-full">
            <Link to="/shop">{t("cta.backToShop")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const soldOut = product.stock <= 0;
  const saved = isSaved(product._id);

  const addToBag = async (mode: "add" | "buy") => {
    if (product.sizes.length > 1 && product.sizes[0] !== "One Size" && !size) {
      toast.error(t("product.selectSize"));
      return;
    }
    setBusy(mode);
    const ok = await add(product._id, { quantity, size, color, silent: mode === "buy" });
    setBusy(null);
    if (ok && mode === "buy") navigate("/checkout");
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <Seo
        title={product.name}
        description={product.description.slice(0, 155)}
        image={product.images[0]}
        type="product"
      />

      <nav className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/" className="transition-colors hover:text-primary">
          {t("nav.home")}
        </Link>
        <span>/</span>
        <Link
          to={`/shop?category=${product.categorySlug}`}
          className="capitalize transition-colors hover:text-primary"
        >
          {product.categorySlug.replace(/-/g, " ")}
        </Link>
        <span>/</span>
        <span className="line-clamp-1 text-foreground/70">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        {/* gallery */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <ProductGallery key={product._id} product={product} />
        </motion.div>

        {/* details */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          <p className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
            {product.categorySlug.replace(/-/g, " ")}
          </p>
          <h1 className="mt-2.5 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            {locale === "bn" && product.nameBn ? product.nameBn : product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2">
              <Stars rating={product.rating || 0} size={15} />
              <span className="text-xs text-muted-foreground">
                {product.rating > 0 ? product.rating.toFixed(1) : "New"} ·{" "}
                {product.reviewCount} {t("product.reviews")}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {product.soldCount}+ {t("product.sold")}
            </span>
          </div>

          <div className="glass mt-5 rounded-3xl p-5">
            <PriceTag price={price} compareAt={compareAt} size="lg" />
            {isFlash && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                <Zap className="size-3.5" strokeWidth={1.9} />
                Flash sale price · limited hours
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {soldOut
                ? t("product.outOfStock")
                : product.stock <= 3
                  ? `${t("product.lowStock")} — ${product.stock} pieces`
                  : `${t("product.inStock")} · ${product.stock} pieces`}
            </p>

            {product.colors.length > 0 && (
              <div className="mt-5">
                <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                  {t("product.color")}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {product.colors.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className={cn(
                        "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                        color === option
                          ? "bg-primary text-primary-foreground"
                          : "glass-soft hover:bg-accent",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                    {t("product.size")}
                  </p>
                  <span className="text-[11px] text-muted-foreground">
                    Studio-fitted sizing
                  </span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {product.sizes.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      className={cn(
                        "min-w-12 cursor-pointer rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                        size === option
                          ? "bg-primary text-primary-foreground"
                          : "glass-soft hover:bg-accent",
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="glass-soft flex items-center gap-1 rounded-full p-1">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="grid size-8 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent"
                >
                  <Minus className="size-3.5" strokeWidth={2} />
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= Math.min(product.stock, 10)}
                  onClick={() =>
                    setQuantity((value) => Math.min(Math.min(product.stock, 10), value + 1))
                  }
                  className="grid size-8 cursor-pointer place-items-center rounded-full transition-colors hover:bg-accent disabled:opacity-40"
                >
                  <Plus className="size-3.5" strokeWidth={2} />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {money(price * quantity)} {t("bag.total").toLowerCase()}
              </span>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <Button
                disabled={soldOut || busy !== null}
                onClick={() => void addToBag("add")}
                className="h-12 flex-1 cursor-pointer rounded-full text-sm font-medium"
              >
                {busy === "add" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShoppingBag className="size-4" strokeWidth={1.8} />
                )}
                {t("product.addToBag")}
              </Button>
              <Button
                variant="outline"
                disabled={soldOut || busy !== null}
                onClick={() => void addToBag("buy")}
                className="glass-strong h-12 flex-1 cursor-pointer rounded-full border-transparent text-sm font-medium"
              >
                {busy === "buy" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Zap className="size-4" strokeWidth={1.8} />
                )}
                {t("product.buyNow")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("nav.wishlist")}
                onClick={() => void toggle(product._id)}
                className="glass-soft size-12 cursor-pointer rounded-full"
              >
                <Heart
                  className={cn("size-5", saved ? "fill-primary text-primary" : "")}
                  strokeWidth={1.7}
                />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { icon: Truck, label: t("checkout.cod") },
              { icon: RefreshCcw, label: "7-day exchange" },
              { icon: ShieldCheck, label: "Quality checked" },
            ].map((item) => (
              <div
                key={item.label}
                className="glass-soft flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-center"
              >
                <item.icon className="size-4 text-primary" strokeWidth={1.8} />
                <span className="text-[10px] leading-3 font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <Accordion type="single" collapsible className="mt-5" defaultValue="description">
            <AccordionItem value="description" className="glass-hairline">
              <AccordionTrigger className="px-4 font-display text-sm font-semibold">
                {t("product.description")}
              </AccordionTrigger>
              <AccordionContent className="px-4 text-sm leading-6 text-muted-foreground">
                {locale === "bn" && product.descriptionBn
                  ? product.descriptionBn
                  : product.description}
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span
                      key={tag}
                      className="glass-soft rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery" className="glass-hairline">
              <AccordionTrigger className="px-4 font-display text-sm font-semibold">
                {t("product.delivery")}
              </AccordionTrigger>
              <AccordionContent className="px-4 text-sm leading-6 text-muted-foreground">
                Inside Dhaka 1–3 working days (৳60), outside Dhaka 3–5 working days
                (৳110–৳150). Free delivery on orders above ৳4,000. Cash on delivery
                available in all 64 districts, with a 7-day exchange window on unworn
                pieces.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </div>

      {/* reviews */}
      <section className="mt-16">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
                Verified buyers
              </span>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {t("product.reviews")} ({product.reviewCount})
              </h2>
            </div>
            <div className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-2.5">
              <span className="font-display text-2xl font-semibold">
                {product.rating > 0 ? product.rating.toFixed(1) : "—"}
              </span>
              <div>
                <Stars rating={product.rating || 0} />
                <p className="text-[11px] text-muted-foreground">
                  {product.reviewCount} {t("product.reviews")}
                </p>
              </div>
            </div>
          </div>

          {canReview?.allowed && (
            <ReviewForm productId={product._id} />
          )}
          {isAuthenticated && canReview && !canReview.allowed && (
            <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
              {canReview.reason === "already"
                ? "Thanks — you have already reviewed this piece."
                : t("product.reviewVerified")}
            </p>
          )}
          {!isAuthenticated && (
            <p className="mt-5 rounded-2xl bg-muted px-4 py-3 text-xs text-muted-foreground">
              <Link to="/auth" className="font-medium text-primary underline">
                {t("nav.signIn")}
              </Link>{" "}
              {t("product.reviewVerified").toLowerCase()}
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {(reviews ?? []).map((review) => (
              <div key={review._id} className="glass-soft rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-brand-blush font-display text-[11px] font-bold text-primary">
                      {review.authorName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="text-sm font-medium">{review.authorName}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <Stars rating={review.rating} className="mt-2.5" />
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {review.comment}
                </p>
              </div>
            ))}
            {(reviews ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No reviews yet — be the first to share how this piece fits.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* related */}
      {(related ?? []).length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("product.related")}
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(related ?? []).map((item, index) => (
              <ProductCard key={item._id} product={item} index={index} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * Premium product gallery: hover zoom that follows the cursor, touch swipe and
 * crossfading slides. Layout is fixed at 4:5 so nothing shifts while loading.
 */
function ProductGallery({ product }: { product: Doc<"products"> }) {
  const { t } = useShop();
  const { price, compareAt, isFlash } = useMemo(() => livePrice(product), [product]);
  const off = discountPercent(price, compareAt);

  const images = product.images.length > 0 ? product.images : [""];
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => {
      setLoaded(false);
      setIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [images.length]);

  const step = (delta: number) => {
    setLoaded(false);
    setIndex((current) => (current + delta + images.length) % images.length);
  };

  const show = (next: number) => {
    if (next === index) return;
    setLoaded(false);
    setIndex(next);
  };

  return (
    <div className="glass rounded-[2rem] p-2.5">
      <div
        className="group relative aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-[1.6rem] bg-muted"
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setOrigin({
            x: ((event.clientX - rect.left) / rect.width) * 100,
            y: ((event.clientY - rect.top) / rect.height) * 100,
          });
        }}
        onMouseLeave={() => setOrigin(null)}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          if (touch) touchStart.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          const touch = event.changedTouches[0];
          if (!start || !touch || images.length < 2) return;
          const dx = touch.clientX - start.x;
          const dy = touch.clientY - start.y;
          // Only claim the gesture when it is clearly horizontal, so page scroll wins.
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        }}
      >
        {!loaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-brand-blush via-muted to-secondary" />
        )}

        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={optimizedImage(images[index], 1400)}
              alt={product.name}
              draggable={false}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              style={{
                transformOrigin: origin ? `${origin.x}% ${origin.y}%` : "center",
              }}
              className={cn(
                "h-full w-full object-cover transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
                origin ? "scale-[1.9]" : "scale-100",
              )}
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => step(-1)}
              className="glass-strong absolute top-1/2 left-3 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
            >
              <ChevronLeft className="size-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => step(1)}
              className="glass-strong absolute top-1/2 right-3 grid size-10 -translate-y-1/2 cursor-pointer place-items-center rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-100"
            >
              <ChevronRight className="size-4" strokeWidth={1.8} />
            </button>
          </>
        )}

        {isFlash && off > 0 && (
          <Badge className="absolute top-3 left-3 rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {off}% {t("common.off")}
          </Badge>
        )}

        <span className="glass-strong pointer-events-none absolute right-3 bottom-3 hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-medium opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:inline-flex">
          <ZoomIn className="size-3" strokeWidth={1.8} /> Hover to zoom
        </span>
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
          {images.map((image, position) => (
            <button
              key={`${image}-${position}`}
              type="button"
              aria-label={`Show image ${position + 1}`}
              onClick={() => show(position)}
              className={cn(
                "shrink-0 cursor-pointer overflow-hidden rounded-2xl border-2 transition-all duration-300",
                position === index
                  ? "border-primary opacity-100"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <SmartImage src={image} alt="" width={220} className="size-20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewForm({ productId }: { productId: Id<"products"> }) {
  const { t } = useShop();
  const addReview = useMutation(api.reviews.add);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="glass-soft mt-6 space-y-3 rounded-2xl p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await addReview({ productId, rating, comment });
          toast.success("Thank you for your review");
          setComment("");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not save review");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="font-display text-sm font-semibold">{t("product.reviewTitle")}</p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} star`}
            onClick={() => setRating(value)}
            className="cursor-pointer"
          >
            <Star
              className={cn(
                "size-5",
                value <= rating
                  ? "fill-brand-champagne text-brand-champagne"
                  : "text-muted-foreground/40",
              )}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="How did it fit? How is the fabric?"
        required
        minLength={4}
        className="min-h-24 rounded-xl"
      />
      <Button
        type="submit"
        disabled={busy}
        className="cursor-pointer rounded-full px-5 text-sm"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {t("product.reviewCta")}
      </Button>
    </form>
  );
}
