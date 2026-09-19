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
import { uploadProductImage } from "@/services/firebase/products";
import type { Doc } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { formatDate } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { Flame, Layers, Loader2, Megaphone, Plus, Pencil, Tag, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
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

const EMPTY_POPUP = {
  title: "",
  description: "",
  image: "",
  ctaText: "",
  ctaUrl: "",
  frequency: "once" as "once" | "daily" | "always",
  startAt: "",
  endAt: "",
  isActive: true,
};

const toDatetimeLocal = (timestamp?: number) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function AdminMarketing() {
  const { money } = useShop();
  const banners = useQuery(api.banners.staffList);
  const coupons = useQuery(api.coupons.staffList);
  const flash = useQuery(api.catalog.flashSales);
  const popups = useQuery(api.popups.staffList);
  const upsertBanner = useMutation(api.banners.upsert);
  const removeBanner = useMutation(api.banners.remove);
  const createCoupon = useMutation(api.coupons.create);
  const setCouponActive = useMutation(api.coupons.setActive);
  const removeCoupon = useMutation(api.coupons.remove);
  const upsertPopup = useMutation(api.popups.upsert);
  const removePopup = useMutation(api.popups.remove);

  const [bannerOpen, setBannerOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Doc<"banners"> | null>(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);
  const [popupOpen, setPopupOpen] = useState(false);
  const [editingPopup, setEditingPopup] = useState<Doc<"popups"> | null>(null);
  const [popupForm, setPopupForm] = useState(EMPTY_POPUP);
  const [busy, setBusy] = useState(false);
  const [popupUploading, setPopupUploading] = useState(false);
  const popupFileRef = useRef<HTMLInputElement>(null);

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

  const openPopup = (popup?: Doc<"popups">) => {
    setEditingPopup(popup ?? null);
    setPopupForm(
      popup
        ? {
            title: popup.title,
            description: popup.description ?? "",
            image: popup.image,
            ctaText: popup.ctaText ?? "",
            ctaUrl: popup.ctaUrl ?? "",
            frequency: popup.frequency,
            startAt: toDatetimeLocal(popup.startAt),
            endAt: toDatetimeLocal(popup.endAt),
            isActive: popup.isActive,
          }
        : EMPTY_POPUP,
    );
    setPopupOpen(true);
  };

  const uploadPopupImage = async (file: File) => {
    setPopupUploading(true);
    try {
      const url = await uploadProductImage(file, `popups/${crypto.randomUUID()}`);
      setPopupForm((current) => ({ ...current, image: url }));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload image");
    } finally {
      setPopupUploading(false);
    }
  };

  const savePopup = async (event: React.FormEvent) => {
    event.preventDefault();
    const startAt = popupForm.startAt ? new Date(popupForm.startAt).getTime() : NaN;
    if (!Number.isFinite(startAt)) {
      toast.error("Choose a start date for the popup.");
      return;
    }
    const endAt = popupForm.endAt ? new Date(popupForm.endAt).getTime() : undefined;
    if (endAt !== undefined && endAt <= startAt) {
      toast.error("The end date must be after the start date.");
      return;
    }
    setBusy(true);
    try {
      await upsertPopup({
        id: editingPopup?._id,
        title: popupForm.title,
        description: popupForm.description || undefined,
        image: popupForm.image,
        ctaText: popupForm.ctaText || undefined,
        ctaUrl: popupForm.ctaUrl || undefined,
        frequency: popupForm.frequency,
        startAt,
        endAt,
        isActive: popupForm.isActive,
      });
      toast.success(editingPopup ? "Popup updated" : "Popup created");
      setPopupOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save popup");
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

      {/* popup ad */}
      <section className="glass rounded-3xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">Popup ad</h2>
          </div>
          <Button
            onClick={() => openPopup()}
            className="cursor-pointer rounded-full"
            size="sm"
          >
            <Plus className="size-4" strokeWidth={2} /> New popup
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          The newest active popup is shown once per visit on the storefront, gated by its frequency setting.
        </p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {popups === undefined ? (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          ) : popups.length === 0 ? (
            <p className="text-xs text-muted-foreground">No popups yet.</p>
          ) : (
            popups.map((popup) => {
              const now = Date.now();
              const live =
                popup.isActive &&
                popup.startAt <= now &&
                (!popup.endAt || popup.endAt > now);
              return (
                <div key={popup._id} className="glass-soft flex gap-3 rounded-2xl p-3">
                  <SmartImage
                    src={popup.image}
                    alt={popup.title}
                    width={320}
                    className="h-24 w-32 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="line-clamp-1 text-sm font-medium">{popup.title}</p>
                      {live ? (
                        <Badge className="rounded-full bg-primary/12 text-[10px] font-semibold text-primary uppercase">
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full text-[10px] uppercase">
                          {popup.isActive ? "Scheduled" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {popup.frequency} · {formatDate(popup.startAt)}
                      {popup.endAt ? ` → ${formatDate(popup.endAt)}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Switch
                        checked={popup.isActive}
                        onCheckedChange={(checked) =>
                          void upsertPopup({
                            id: popup._id,
                            title: popup.title,
                            description: popup.description,
                            image: popup.image,
                            ctaText: popup.ctaText,
                            ctaUrl: popup.ctaUrl,
                            frequency: popup.frequency,
                            startAt: popup.startAt,
                            endAt: popup.endAt,
                            isActive: checked,
                          })
                        }
                        aria-label="Popup active"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openPopup(popup)}
                        className="cursor-pointer rounded-full text-xs"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void removePopup({ id: popup._id })}
                        className="cursor-pointer rounded-full text-xs text-destructive"
                      >
                        <Trash2 className="size-3.5" /> Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
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

      {/* popup dialog */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="glass-strong max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingPopup ? "Edit popup" : "New popup"}
            </DialogTitle>
            <DialogDescription>
              Shown on the storefront while active, gated by the frequency you choose.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={savePopup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Title</Label>
              <Input
                id="p-title"
                required
                value={popupForm.title}
                onChange={(event) =>
                  setPopupForm((current) => ({ ...current, title: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Input
                id="p-desc"
                value={popupForm.description}
                onChange={(event) =>
                  setPopupForm((current) => ({ ...current, description: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-image">Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="p-image"
                  required
                  value={popupForm.image}
                  onChange={(event) =>
                    setPopupForm((current) => ({ ...current, image: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
                <input
                  ref={popupFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void uploadPopupImage(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={popupUploading}
                  onClick={() => popupFileRef.current?.click()}
                  className="h-11 shrink-0 cursor-pointer rounded-xl"
                >
                  {popupUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Upload"
                  )}
                </Button>
              </div>
              {popupForm.image ? (
                <SmartImage
                  src={popupForm.image}
                  alt="Popup preview"
                  width={480}
                  className="mt-2 aspect-[4/3] w-full rounded-2xl"
                />
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-cta">CTA text</Label>
                <Input
                  id="p-cta"
                  value={popupForm.ctaText}
                  onChange={(event) =>
                    setPopupForm((current) => ({ ...current, ctaText: event.target.value }))
                  }
                  placeholder="Shop the sale"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-url">CTA link</Label>
                <Input
                  id="p-url"
                  value={popupForm.ctaUrl}
                  onChange={(event) =>
                    setPopupForm((current) => ({ ...current, ctaUrl: event.target.value }))
                  }
                  placeholder="/shop"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-frequency">Frequency</Label>
                <select
                  id="p-frequency"
                  value={popupForm.frequency}
                  onChange={(event) =>
                    setPopupForm((current) => ({
                      ...current,
                      frequency: event.target.value as "once" | "daily" | "always",
                    }))
                  }
                  className="h-11 w-full rounded-xl border border-border/60 bg-card/70 px-3 text-sm"
                >
                  <option value="once">Once (until dismissed)</option>
                  <option value="daily">Once per day</option>
                  <option value="always">Every visit</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-start">Starts</Label>
                <Input
                  id="p-start"
                  type="datetime-local"
                  required
                  value={popupForm.startAt}
                  onChange={(event) =>
                    setPopupForm((current) => ({ ...current, startAt: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-end">Ends (optional)</Label>
                <Input
                  id="p-end"
                  type="datetime-local"
                  value={popupForm.endAt}
                  onChange={(event) =>
                    setPopupForm((current) => ({ ...current, endAt: event.target.value }))
                  }
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={popupForm.isActive}
                onCheckedChange={(checked) =>
                  setPopupForm((current) => ({ ...current, isActive: checked }))
                }
              />
              Active on storefront
            </label>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="cursor-pointer rounded-full">
                {busy && <Loader2 className="size-4 animate-spin" />}
                {editingPopup ? "Save popup" : "Create popup"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
