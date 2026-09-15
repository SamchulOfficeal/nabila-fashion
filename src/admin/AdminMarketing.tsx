import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/services/firebase/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { formatDate } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { Flame, Layers, Loader2, Plus, Pencil, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EMPTY_BANNER = {
  title: "",
  subtitle: "",
  eyebrow: "",
  image: "",
  ctaLabel: "",
  ctaHref: "",
  order: 0,
  isActive: true,
};

const EMPTY_COUPON = {
  code: "",
  description: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  minSpend: "",
  days: "30",
  usageLimit: "",
};

export function AdminMarketing() {
  const { money } = useShop();
  const banners = useQuery(api.banners.staffList);
  const coupons = useQuery(api.coupons.staffList);
  const flash = useQuery(api.catalog.flashSales);
  const upsertBanner = useMutation(api.banners.upsert);
  const removeBanner = useMutation(api.banners.remove);
  const createCoupon = useMutation(api.coupons.create);
  const setCouponActive = useMutation(api.coupons.setActive);
  const removeCoupon = useMutation(api.coupons.remove);

  const [bannerOpen, setBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Doc<"banners"> | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [busy, setBusy] = useState(false);

  const openBanner = (banner?: Doc<"banners">) => {
    setEditingBanner(banner ?? null);
    setBannerForm(
      banner
        ? {
            title: banner.title,
            subtitle: banner.subtitle ?? "",
            eyebrow: banner.eyebrow ?? "",
            image: banner.image,
            ctaLabel: banner.ctaLabel ?? "",
            ctaHref: banner.ctaHref ?? "",
            order: banner.order,
            isActive: banner.isActive,
          }
        : EMPTY_BANNER,
    );
    setBannerOpen(true);
  };

  const saveBanner = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await upsertBanner({
        id: editingBanner?._id,
        title: bannerForm.title,
        subtitle: bannerForm.subtitle || undefined,
        eyebrow: bannerForm.eyebrow || undefined,
        image: bannerForm.image,
        ctaLabel: bannerForm.ctaLabel || undefined,
        ctaHref: bannerForm.ctaHref || undefined,
        order: Number(bannerForm.order) || 0,
        isActive: bannerForm.isActive,
      });
      toast.success(editingBanner ? "Banner updated" : "Banner added");
      setBannerOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save banner");
    } finally {
      setBusy(false);
    }
  };

  const saveCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const days = Number(couponForm.days);
    try {
      await createCoupon({
        code: couponForm.code,
        description: couponForm.description || undefined,
        type: couponForm.type,
        value: Number(couponForm.value),
        minSpend: couponForm.minSpend ? Number(couponForm.minSpend) : 0,
        expiresAt: days > 0 ? Date.now() + days * 24 * 60 * 60 * 1000 : undefined,
        usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : undefined,
      });
      toast.success("Coupon created");
      setCouponOpen(false);
      setCouponForm(EMPTY_COUPON);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create coupon");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Seo title="Marketing" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Marketing
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Homepage slider, coupons and the live flash sale window.
          </p>
        </div>
      </div>

      {/* banners */}
      <section className="glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Homepage slider
            </h2>
          </div>
          <Button
            onClick={() => openBanner()}
            className="cursor-pointer rounded-full"
            size="sm"
          >
            <Plus className="size-4" strokeWidth={2} /> New banner
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {banners === undefined ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : (
            banners.map((banner) => (
              <div key={banner._id} className="glass-soft flex gap-3 rounded-2xl p-3">
                <SmartImage
                  src={banner.image}
                  alt={banner.title}
                  width={320}
                  className="h-24 w-32 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 text-sm font-medium">{banner.title}</p>
                    {!banner.isActive && (
                      <Badge variant="outline" className="rounded-full text-[9px] uppercase">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                    {banner.subtitle}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openBanner(banner)}
                      className="cursor-pointer rounded-full text-xs"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void removeBanner({ id: banner._id })}
                      className="cursor-pointer rounded-full text-xs text-destructive"
                    >
                      <Trash2 className="size-3.5" /> Remove
                    </Button>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      #{banner.order}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* flash sale */}
      <section className="glass rounded-3xl p-5">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-primary" strokeWidth={1.8} />
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Live flash sale
          </h2>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Set a flash sale price and duration on any product from the Products screen.
        </p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {(flash ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No flash sales running right now.
            </p>
          ) : (
            (flash ?? []).map((product) => (
              <div
                key={product._id}
                className="glass-soft flex items-center gap-3 rounded-2xl p-3"
              >
                <SmartImage
                  src={product.images[0]}
                  alt={product.name}
                  width={120}
                  className="size-12 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-medium">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {money(product.flashSalePrice ?? 0)} ·{" "}
                    {product.flashSaleEndsAt
                      ? formatDate(product.flashSaleEndsAt)
                      : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* coupons */}
      <section className="glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">Coupons</h2>
          </div>
          <Button
            onClick={() => setCouponOpen(true)}
            className="cursor-pointer rounded-full"
            size="sm"
          >
            <Plus className="size-4" strokeWidth={2} /> New coupon
          </Button>
        </div>

        <div className="mt-4 space-y-2.5">
          {coupons === undefined ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : coupons.length === 0 ? (
            <p className="text-xs text-muted-foreground">No coupons yet.</p>
          ) : (
            coupons.map((coupon) => (
              <div
                key={coupon._id}
                className="flex flex-col gap-3 rounded-2xl px-3 py-3 odd:bg-muted/50 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-semibold tracking-wide">
                      {coupon.code}
                    </p>
                    <Badge className="rounded-full bg-primary/12 text-[10px] font-semibold text-primary uppercase">
                      {coupon.type === "percent"
                        ? `${coupon.value}% off`
                        : `${money(coupon.value)} off`}
                    </Badge>
                    {coupon.expiresAt && coupon.expiresAt < Date.now() && (
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                        Expired
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {coupon.description ?? "—"} · min spend {money(coupon.minSpend)} ·{" "}
                    {coupon.usedCount}
                    {coupon.usageLimit ? `/${coupon.usageLimit}` : ""} used
                    {coupon.expiresAt ? ` · until ${formatDate(coupon.expiresAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={coupon.isActive}
                    onCheckedChange={(checked) =>
                      void setCouponActive({ id: coupon._id, isActive: checked })
                    }
                    aria-label="Coupon active"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void removeCoupon({ id: coupon._id })}
                    className="cursor-pointer rounded-full text-xs text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* banner dialog */}
      <Dialog open={bannerOpen} onOpenChange={setBannerOpen}>
        <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingBanner ? "Edit banner" : "New banner"}
            </DialogTitle>
            <DialogDescription>
              Banners appear in the homepage slider in ascending order.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveBanner} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-eyebrow">Eyebrow</Label>
              <Input
                id="b-eyebrow"
                value={bannerForm.eyebrow}
                onChange={(event) =>
                  setBannerForm((current) => ({ ...current, eyebrow: event.target.value }))
                }
                placeholder="Autumn / Winter Edit"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-title">Title</Label>
              <Input
                id="b-title"
                required
                value={bannerForm.title}
                onChange={(event) =>
                  setBannerForm((current) => ({ ...current, title: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-subtitle">Subtitle</Label>
              <Input
                id="b-subtitle"
                value={bannerForm.subtitle}
                onChange={(event) =>
                  setBannerForm((current) => ({ ...current, subtitle: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-image">Image URL</Label>
              <Input
                id="b-image"
                required
                value={bannerForm.image}
                onChange={(event) =>
                  setBannerForm((current) => ({ ...current, image: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-cta">CTA label</Label>
                <Input
                  id="b-cta"
                  value={bannerForm.ctaLabel}
                  onChange={(event) =>
                    setBannerForm((current) => ({
                      ...current,
                      ctaLabel: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-href">CTA link</Label>
                <Input
                  id="b-href"
                  value={bannerForm.ctaHref}
                  onChange={(event) =>
                    setBannerForm((current) => ({ ...current, ctaHref: event.target.value }))
                  }
                  placeholder="/shop?category=saree"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-order">Order</Label>
                <Input
                  id="b-order"
                  type="number"
                  value={bannerForm.order}
                  onChange={(event) =>
                    setBannerForm((current) => ({
                      ...current,
                      order: Number(event.target.value),
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={bannerForm.isActive}
                onCheckedChange={(checked) =>
                  setBannerForm((current) => ({ ...current, isActive: checked }))
                }
              />
              Active in slider
            </label>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="cursor-pointer rounded-full">
                {busy && <Loader2 className="size-4 animate-spin" />}
                Save banner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* coupon dialog */}
      <Dialog open={couponOpen} onOpenChange={setCouponOpen}>
        <DialogContent className="glass-strong sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">New coupon</DialogTitle>
            <DialogDescription>
              Coupons are validated on the server at checkout.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCoupon} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-code">Code</Label>
                <Input
                  id="c-code"
                  required
                  minLength={3}
                  value={couponForm.code}
                  onChange={(event) =>
                    setCouponForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                  className="h-11 rounded-xl uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-type">Type</Label>
                <select
                  id="c-type"
                  value={couponForm.type}
                  onChange={(event) =>
                    setCouponForm((current) => ({
                      ...current,
                      type: event.target.value as "percent" | "fixed",
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border/60 bg-card/70 px-3 text-sm"
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-value">
                  {couponForm.type === "percent" ? "Percent off" : "Amount off (৳)"}
                </Label>
                <Input
                  id="c-value"
                  required
                  type="number"
                  min={1}
                  value={couponForm.value}
                  onChange={(event) =>
                    setCouponForm((current) => ({ ...current, value: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-min">Minimum spend (৳)</Label>
                <Input
                  id="c-min"
                  type="number"
                  min={0}
                  value={couponForm.minSpend}
                  onChange={(event) =>
                    setCouponForm((current) => ({
                      ...current,
                      minSpend: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-days">Valid for (days)</Label>
                <Input
                  id="c-days"
                  type="number"
                  min={0}
                  value={couponForm.days}
                  onChange={(event) =>
                    setCouponForm((current) => ({ ...current, days: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-limit">Usage limit</Label>
                <Input
                  id="c-limit"
                  type="number"
                  min={0}
                  value={couponForm.usageLimit}
                  onChange={(event) =>
                    setCouponForm((current) => ({
                      ...current,
                      usageLimit: event.target.value,
                    }))
                  }
                  placeholder="Unlimited"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="c-desc">Description</Label>
                <Input
                  id="c-desc"
                  value={couponForm.description}
                  onChange={(event) =>
                    setCouponForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="cursor-pointer rounded-full">
                {busy && <Loader2 className="size-4 animate-spin" />}
                Create coupon
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
