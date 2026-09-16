import { FlashCountdown, livePrice, ProductCard } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { cn, discountPercent } from "@/lib/utils";
import { useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Gem,
  Headphones,
  Ruler,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";

const PROMISES = [
  {
    icon: Truck,
    title: "Cash on delivery, nationwide",
    body: "Check your parcel before you pay. 64 districts, 1–5 working days.",
  },
  {
    icon: Ruler,
    title: "Studio-fitted sizing",
    body: "Every piece is measured on a real body and listed with true dimensions.",
  },
  {
    icon: BadgeCheck,
    title: "Authentic fabrics only",
    body: "Handloom jamdani, Japanese nida and European linen — sourced direct.",
  },
  {
    icon: Headphones,
    title: "Personal styling help",
    body: "Message us and a stylist will match the piece to your occasion.",
  },
];

const TESTIMONIALS = [
  {
    name: "Tasnim R.",
    city: "Dhanmondi, Dhaka",
    quote:
      "The jamdani arrived folded in tissue with a handwritten note. It looked better than the photos — my mother-in-law asked which boutique I found it at.",
    rating: 5,
  },
  {
    name: "Farhana A.",
    city: "Chattogram",
    quote:
      "Ordered the nida abaya and one pleated hijab on Tuesday, wore it to a wedding on Friday. The cut is genuinely premium for the price.",
    rating: 5,
  },
  {
    name: "Nusrat J.",
    city: "Sylhet",
    quote:
      "COD made it easy to trust a new store. The emerald gown fit exactly like the size chart said and the return window gave me confidence.",
    rating: 4,
  },
];

const MARQUEE_ITEMS = [
  "Handloom jamdani",
  "Cash on delivery",
  "Free delivery over ৳4,000",
  "7-day exchange",
  "Studio-fitted sizing",
  "Authentic fabrics",
  "Stylist on WhatsApp",
];

export default function Landing() {
  const { t, money, locale } = useShop();
  const navigate = useNavigate();

  const banners = useQuery(api.banners.list);
  const categories = useQuery(api.catalog.categories);
  const flash = useQuery(api.catalog.flashSales);
  const featured = useQuery(api.catalog.featured, { limit: 8 });
  const newest = useQuery(api.catalog.list, { sort: "newest", limit: 4 });

  const [slide, setSlide] = useState(0);
  const slides = banners ?? [];

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[slide % Math.max(slides.length, 1)];

  const topFlash = useMemo(() => (flash ?? []).slice(0, 5), [flash]);
  const flashEndsAt = topFlash[0]?.flashSaleEndsAt;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <Seo
        title="NABILA FASHION — Premium Women's Fashion Boutique"
        description="Handloom sarees, three piece sets, abayas, gowns, bags and jewellery. Cash on delivery across Bangladesh with free delivery over ৳4,000."
        image={activeSlide?.image}
      />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative pt-6 lg:pt-10">
        <div className="glass relative overflow-hidden rounded-[2.25rem] p-2 shadow-lg shadow-black/5">
          <div className="relative h-[520px] overflow-hidden rounded-[1.9rem] sm:h-[560px] lg:h-[600px]">
            <AnimatePresence mode="sync">
              {activeSlide && (
                <motion.div
                  key={activeSlide._id}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0"
                >
                  <SmartImage
                    src={activeSlide.image}
                    alt={activeSlide.title}
                    width={1600}
                    eager
                    className="h-full w-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/55 to-transparent dark:from-black/80 dark:via-black/50" />

            <div className="relative z-10 flex h-full flex-col justify-center px-6 sm:px-10 lg:px-14">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide?._id ?? "empty"}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="max-w-xl"
                >
                  <span className="glass-strong inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.22em] uppercase">
                    <Sparkles className="size-3 text-primary" strokeWidth={2} />
                    {activeSlide?.eyebrow ?? "NABILA FASHION"}
                  </span>
                  <h1 className="mt-5 font-display text-[2.35rem] leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-[3.9rem]">
                    {activeSlide?.title ?? "Premium women's fashion, made in Bangladesh"}
                  </h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-foreground/75 sm:text-base sm:leading-7">
                    {activeSlide?.subtitle ?? t("footer.tagline")}
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <Button
                      size="lg"
                      className="h-12 cursor-pointer rounded-full px-7 text-sm font-medium"
                      onClick={() => navigate(activeSlide?.ctaHref ?? "/shop")}
                    >
                      {activeSlide?.ctaLabel ?? t("cta.shopNow")}
                      <ArrowRight className="size-4" strokeWidth={1.8} />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      asChild
                      className="glass-strong h-12 cursor-pointer rounded-full border-transparent px-7 text-sm font-medium"
                    >
                      <Link to="/shop?flash=1">{t("nav.sale")}</Link>
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-9 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Previous banner"
                    onClick={() =>
                      setSlide((current) => (current - 1 + slides.length) % slides.length)
                    }
                    className="glass-strong grid size-10 cursor-pointer place-items-center rounded-full transition-transform hover:scale-105"
                  >
                    <ChevronLeft className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next banner"
                    onClick={() => setSlide((current) => (current + 1) % slides.length)}
                    className="glass-strong grid size-10 cursor-pointer place-items-center rounded-full transition-transform hover:scale-105"
                  >
                    <ChevronRight className="size-4" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {slides.map((banner, index) => (
                    <button
                      key={banner._id}
                      type="button"
                      aria-label={`Go to banner ${index + 1}`}
                      onClick={() => setSlide(index)}
                      className={cn(
                        "h-1.5 cursor-pointer rounded-full transition-all duration-500",
                        index === slide % Math.max(slides.length, 1)
                          ? "w-8 bg-primary"
                          : "w-3 bg-foreground/25 hover:bg-foreground/40",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* floating stat chips */}
            <div className="absolute right-6 bottom-6 z-10 hidden gap-3 lg:flex">
              {[
                { value: "12k+", label: "Happy customers" },
                { value: "64", label: "Districts served" },
                { value: "4.8★", label: "Average rating" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.12, duration: 0.6 }}
                  className="glass-strong rounded-2xl px-4 py-3 text-center"
                >
                  <p className="font-display text-lg font-semibold">{stat.value}</p>
                  <p className="text-[10px] tracking-wide text-muted-foreground uppercase">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="glass mt-4 flex overflow-hidden rounded-full py-3">
          <div className="animate-marquee flex shrink-0 items-center gap-8 pr-8">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="flex shrink-0 items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-foreground/70 uppercase"
              >
                <Gem className="size-3 text-primary" strokeWidth={1.8} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- categories */}
      <section className="pt-20">
        <SectionHeading
          eyebrow={t("section.categoriesHint")}
          title={t("section.categories")}
          action={
            <Button
              variant="ghost"
              asChild
              className="cursor-pointer rounded-full text-sm"
            >
              <Link to="/shop">
                {t("cta.viewAll")} <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(categories ?? []).map((category, index) => (
            <motion.div
              key={category._id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Link
                to={`/shop?category=${category.slug}`}
                className="glass lift block overflow-hidden rounded-3xl p-2.5 transition-shadow duration-300 hover:shadow-xl"
              >
                <SmartImage
                  src={category.image}
                  alt={category.name}
                  width={420}
                  className="aspect-square rounded-2xl"
                />
                <div className="px-2 pt-3 pb-1.5">
                  <p className="font-display text-sm font-semibold tracking-tight">
                    {locale === "bn" && category.nameBn ? category.nameBn : category.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {category.tagline}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- flash sale */}
      {topFlash.length > 0 && (
        <section className="pt-20">
          <div className="glass overflow-hidden rounded-[2rem] p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-primary uppercase">
                  <Sparkles className="size-3" strokeWidth={2} />
                  {t("section.flashHint")}
                </span>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t("section.flash")}
                </h2>
              </div>
              {flashEndsAt && (
                <div className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                    Ends in
                  </span>
                  <FlashCountdown
                    endsAt={flashEndsAt}
                    className="font-display text-lg font-semibold text-primary"
                  />
                </div>
              )}
            </div>

            <div className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {topFlash.map((product, index) => {
                const { price, compareAt } = livePrice(product);
                const off = discountPercent(price, compareAt);
                return (
                  <motion.div
                    key={product._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: Math.min(index * 0.05, 0.3) }}
                    className="w-[220px] shrink-0 snap-start sm:w-[240px]"
                  >
                    <Link
                      to={`/product/${product.slug}`}
                      className="glass-soft group w-full rounded-3xl p-2.5 shadow-lg shadow-black/5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                    >
                    <SmartImage
                      src={product.images[0]}
                      alt={product.name}
                      width={500}
                      className="aspect-[4/5] rounded-2xl"
                    />
                    <div className="px-1.5 pt-3 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                          {off}% {t("common.off")}
                        </span>
                        {product.flashSaleEndsAt && (
                          <FlashCountdown
                            endsAt={product.flashSaleEndsAt}
                            className="text-[10px] text-muted-foreground"
                          />
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-medium">{product.name}</p>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="font-display text-base font-semibold">
                          {money(price)}
                        </span>
                        {compareAt && (
                          <span className="text-xs text-muted-foreground line-through">
                            {money(compareAt)}
                          </span>
                        )}
                      </div>
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {Math.max(0, product.stock)} left
                      </span>
                    </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------- featured */}
      <section className="pt-20">
        <SectionHeading
          eyebrow={t("section.featuredHint")}
          title={t("section.featured")}
          action={
            <Button
              variant="ghost"
              asChild
              className="cursor-pointer rounded-full text-sm"
            >
              <Link to="/shop">
                {t("cta.viewAll")} <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          }
        />
        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(featured ?? []).map((product, index) => (
            <ProductCard key={product._id} product={product} index={index} />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- promises */}
      <section className="pt-20">
        <div className="glass rounded-[2rem] p-6 sm:p-10">
          <SectionHeading
            eyebrow="Why shop with us"
            title={t("section.promise")}
            align="center"
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((promise, index) => (
              <motion.div
                key={promise.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.06 }}
                className="glass-soft rounded-3xl p-5"
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-brand-blush text-primary">
                  <promise.icon className="size-5" strokeWidth={1.6} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold tracking-tight">
                  {promise.title}
                </h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  {promise.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ new arrivals */}
      <section className="pt-20">
        <SectionHeading eyebrow={t("section.newInHint")} title={t("section.newIn")} />
        <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(newest ?? []).map((product, index) => (
            <ProductCard key={product._id} product={product} index={index} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ testimonials */}
      <section className="pt-20">
        <SectionHeading
          eyebrow="Real reviews from verified buyers"
          title={t("section.reviews")}
          align="center"
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {TESTIMONIALS.map((item, index) => (
            <motion.figure
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="glass flex flex-col rounded-3xl p-6"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className={cn(
                      "size-3.5",
                      starIndex < item.rating
                        ? "fill-brand-champagne text-brand-champagne"
                        : "text-muted-foreground/30",
                    )}
                    strokeWidth={1.5}
                  />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-6 text-foreground/85">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-border/50 pt-4">
                <span className="grid size-9 place-items-center rounded-full bg-brand-blush font-display text-xs font-bold text-primary">
                  {item.name.slice(0, 1)}
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {item.city}
                  </span>
                </span>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="pt-20">
        <div className="glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
          <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary/20 blur-3xl animate-float-slow" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
                {t("section.newsletter")}
              </span>
              <h2 className="mt-3 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
                {t("section.newsletterHint")}
              </h2>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  asChild
                  className="h-12 cursor-pointer rounded-full px-7 text-sm font-medium"
                >
                  <Link to="/auth">
                    Create your account <ArrowRight className="size-4" strokeWidth={1.8} />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="glass-strong h-12 cursor-pointer rounded-full border-transparent px-7 text-sm font-medium"
                >
                  <Link to="/shop">{t("cta.discover")}</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(categories ?? []).slice(0, 4).map((category) => (
                <Link
                  key={category._id}
                  to={`/shop?category=${category.slug}`}
                  className="glass-soft lift rounded-2xl p-3"
                >
                  <SmartImage
                    src={category.image}
                    alt={category.name}
                    width={300}
                    className="aspect-[4/3] rounded-xl"
                  />
                  <p className="mt-2 text-xs font-medium">{category.name}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
      )}
    >
      <div className={cn(align === "center" && "text-center")}>
        <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
          {eyebrow}
        </span>
        <h2 className="mt-2.5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}
