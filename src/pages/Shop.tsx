import { ProductCard } from "@/components/ProductCard";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { cn } from "@/lib/utils";
import { useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Best selling" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
] as const;

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "52", "54", "One Size", "36", "38"];
const COLOR_OPTIONS = [
  "Black",
  "Ivory",
  "Blush",
  "Champagne",
  "Emerald",
  "Navy",
  "Mocha",
  "Sage",
];

export default function Shop() {
  const { t, locale } = useShop();
  const [params, setParams] = useSearchParams();

  const categorySlug = params.get("category") ?? "";
  const search = params.get("q") ?? "";
  const flashOnly = params.get("flash") === "1";
  const sort = (params.get("sort") ?? "newest") as (typeof SORTS)[number]["value"];
  const minPrice = params.get("min");
  const maxPrice = params.get("max");
  const sizeFilter = (params.get("sizes") ?? "").split(",").filter(Boolean);
  const colorFilter = (params.get("colors") ?? "").split(",").filter(Boolean);
  const inStock = params.get("stock") === "1";

  const [visible, setVisible] = useState(12);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const key = params.toString();
  useEffect(() => setVisible(12), [key]);

  const categories = useQuery(api.catalog.categories);
  const categoryMeta = useQuery(
    api.catalog.categoryBySlug,
    categorySlug ? { slug: categorySlug } : "skip",
  );

  const results = useQuery(api.catalog.list, {
    category: categorySlug || undefined,
    search: search || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sizes: sizeFilter.length > 0 ? sizeFilter : undefined,
    colors: colorFilter.length > 0 ? colorFilter : undefined,
    sort,
    flashSaleOnly: flashOnly || undefined,
    inStockOnly: inStock || undefined,
    limit: 60,
  });

  const activeCategory = useMemo(
    () => (categories ?? []).find((item) => item.slug === categorySlug),
    [categories, categorySlug],
  );

  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    mutate(next);
    setParams(next, { replace: true });
  };

  const toggleListValue = (field: "sizes" | "colors", value: string) => {
    update((next) => {
      const current = (next.get(field) ?? "").split(",").filter(Boolean);
      const updated = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      if (updated.length === 0) next.delete(field);
      else next.set(field, updated.join(","));
    });
  };

  const clearAll = () => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    setParams(next, { replace: true });
  };

  const activeFilterCount =
    (categorySlug ? 1 : 0) +
    (flashOnly ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    sizeFilter.length +
    colorFilter.length +
    (inStock ? 1 : 0);

  const filterPanel = (
    <div className="space-y-7">
      <div>
        <Label className="text-[10px] font-semibold tracking-[0.2em] uppercase">
          {t("section.categories")}
        </Label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => update((next) => next.delete("category"))}
            className={cn(
              "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              !categorySlug
                ? "bg-primary text-primary-foreground"
                : "glass-soft hover:bg-accent",
            )}
          >
            {t("cta.viewAll")}
          </button>
          {(categories ?? []).map((category) => (
            <button
              key={category._id}
              type="button"
              onClick={() =>
                update((next) => next.set("category", category.slug))
              }
              className={cn(
                "cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                categorySlug === category.slug
                  ? "bg-primary text-primary-foreground"
                  : "glass-soft hover:bg-accent",
              )}
            >
              {locale === "bn" && category.nameBn ? category.nameBn : category.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-[0.2em] uppercase">
          {t("common.price")} (৳)
        </Label>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="0"
            defaultValue={minPrice ?? ""}
            onBlur={(event) =>
              update((next) => {
                if (event.target.value) next.set("min", event.target.value);
                else next.delete("min");
              })
            }
            className="h-10 rounded-xl"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="15000"
            defaultValue={maxPrice ?? ""}
            onBlur={(event) =>
              update((next) => {
                if (event.target.value) next.set("max", event.target.value);
                else next.delete("max");
              })
            }
            className="h-10 rounded-xl"
          />
        </div>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-[0.2em] uppercase">
          {t("product.size")}
        </Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleListValue("sizes", size)}
              className={cn(
                "min-w-11 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-colors",
                sizeFilter.includes(size)
                  ? "bg-primary text-primary-foreground"
                  : "glass-soft hover:bg-accent",
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-[10px] font-semibold tracking-[0.2em] uppercase">
          {t("product.color")}
        </Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => toggleListValue("colors", color)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                colorFilter.includes(color)
                  ? "bg-primary text-primary-foreground"
                  : "glass-soft hover:bg-accent",
              )}
            >
              {color}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-soft space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("product.inStock")}</Label>
          <Switch
            checked={inStock}
            onCheckedChange={(checked) =>
              update((next) => {
                if (checked) next.set("stock", "1");
                else next.delete("stock");
              })
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{t("nav.sale")}</Label>
          <Switch
            checked={flashOnly}
            onCheckedChange={(checked) =>
              update((next) => {
                if (checked) next.set("flash", "1");
                else next.delete("flash");
              })
            }
          />
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          onClick={clearAll}
          className="w-full cursor-pointer rounded-full"
        >
          <X className="size-4" /> {t("common.clear")}
        </Button>
      )}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo
        title={
          activeCategory
            ? `${activeCategory.name} — Shop`
            : search
              ? `Search: ${search}`
              : "Shop all"
        }
        description={
          activeCategory?.tagline ??
          "Browse the full NABILA FASHION collection: sarees, three piece sets, abayas, gowns, bags and jewellery."
        }
      />

      <header className="glass rounded-[2rem] p-6 sm:p-8">
        <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
          {flashOnly ? t("section.flash") : t("nav.collections")}
        </span>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {activeCategory
                ? locale === "bn" && activeCategory.nameBn
                  ? activeCategory.nameBn
                  : activeCategory.name
                : search
                  ? `“${search}”`
                  : t("nav.shop")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {activeCategory?.tagline ??
                "Handpicked pieces, studio-fitted sizing and cash on delivery."}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="font-display text-xl text-foreground">
              {results?.length ?? 0}
            </strong>{" "}
            {t("common.results")}
          </p>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="glass sticky top-28 rounded-3xl p-5">{filterPanel}</div>
        </aside>

        <div>
          <div className="glass flex items-center justify-between gap-3 rounded-2xl p-3">
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="cursor-pointer rounded-full lg:hidden"
                >
                  <SlidersHorizontal className="size-4" />
                  {t("common.filters")}
                  {activeFilterCount > 0 && (
                    <span className="ml-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="glass-strong w-[86%] overflow-y-auto sm:max-w-sm"
              >
                <SheetHeader>
                  <SheetTitle className="font-display">{t("common.filters")}</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-8">{filterPanel}</div>
              </SheetContent>
            </Sheet>

            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-xs text-muted-foreground">{t("common.sort")}</span>
              <div className="flex flex-wrap gap-1.5">
                {SORTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update((next) => next.set("sort", option.value))}
                    className={cn(
                      "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                      sort === option.value
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <select
              value={sort}
              onChange={(event) =>
                update((next) => next.set("sort", event.target.value))
              }
              className="h-10 rounded-xl border border-border/60 bg-card/70 px-3 text-xs font-medium lg:hidden"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {activeFilterCount > 0 && (
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
              {categorySlug && activeCategory && (
                <FilterChip
                  label={activeCategory.name}
                  onClear={() => update((next) => next.delete("category"))}
                />
              )}
              {flashOnly && (
                <FilterChip
                  label={t("nav.sale")}
                  onClear={() => update((next) => next.delete("flash"))}
                />
              )}
              {minPrice && (
                <FilterChip
                  label={`৳${minPrice}+`}
                  onClear={() => update((next) => next.delete("min"))}
                />
              )}
              {maxPrice && (
                <FilterChip
                  label={`≤ ৳${maxPrice}`}
                  onClear={() => update((next) => next.delete("max"))}
                />
              )}
              {sizeFilter.map((size) => (
                <FilterChip
                  key={`size-${size}`}
                  label={`${t("product.size")} ${size}`}
                  onClear={() => toggleListValue("sizes", size)}
                />
              ))}
              {colorFilter.map((color) => (
                <FilterChip
                  key={`color-${color}`}
                  label={color}
                  onClear={() => toggleListValue("colors", color)}
                />
              ))}
              {inStock && (
                <FilterChip
                  label={t("product.inStock")}
                  onClear={() => update((next) => next.delete("stock"))}
                />
              )}
            </div>
          )}

          <div className="mt-6">
            {results === undefined ? (
              <div className="grid place-items-center py-24">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : results.length === 0 ? (
              <div className="glass grid place-items-center gap-4 rounded-3xl px-6 py-20 text-center">
                <span className="grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
                  <SearchX className="size-7" strokeWidth={1.5} />
                </span>
                <div>
                  <p className="font-display text-xl font-semibold">
                    {t("search.empty")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try removing a filter or searching for something else.
                  </p>
                </div>
                <Button
                  onClick={clearAll}
                  className="cursor-pointer rounded-full px-6"
                >
                  {t("common.clear")}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  <AnimatePresence initial={false}>
                    {results.slice(0, visible).map((product, index) => (
                      <ProductCard
                        key={product._id}
                        product={product}
                        index={index % 6}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {visible < results.length && (
                  <div className="mt-8 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setVisible((current) => current + 12)}
                      className="glass-strong cursor-pointer rounded-full border-transparent px-7"
                    >
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      type="button"
      onClick={onClear}
      className="glass-soft flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
    >
      {label}
      <X className="size-3" strokeWidth={2} />
    </motion.button>
  );
}
