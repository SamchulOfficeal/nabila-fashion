import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/services/firebase/api";
import {
  BD_DIVISIONS,
  deliveryChargeFor,
  districtsFor,
  nearestDivision,
} from "@/convex/lib/delivery";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "@/services/firebase/hooks";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  CreditCard,
  Loader2,
  LocateFixed,
  MapPin,
  ShieldCheck,
  Tag,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export default function Checkout() {
  const { t, money, freeDeliveryThreshold } = useShop();
  const { items, subtotal, count, isLoading } = useCart();
  const { user } = useAuth();
  const profile = useQuery(api.profile.get);
  const placeOrder = useMutation(api.orders.placeOrder);
  const dispatchAlert = useAction(api.notify.dispatchOrderAlert);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    division: "",
    district: "",
    address: "",
    note: "",
    resellerCode: "",
  });
  const [payment, setPayment] = useState<"cod" | "bkash" | "nagad" | "balance">("cod");
  const { paymentBkashEnabled, paymentBkashNumber, paymentNagadEnabled, paymentNagadNumber, paymentCodEnabled } = useShop();
  const wallet = useQuery(api.balance.myBalance);
  const balance = wallet?.balance ?? 0;

  /** Payment methods actually enabled by the admin (Settings → Payments).
      A method the admin turned off NEVER appears — not even disabled. */
  const availableMethods = useMemo(() => {
    const methods: Array<"cod" | "bkash" | "nagad" | "balance"> = [];
    if (paymentCodEnabled) methods.push("cod");
    if (paymentBkashEnabled) methods.push("bkash");
    if (paymentNagadEnabled) methods.push("nagad");
    methods.push("balance"); // always visible so customers learn about it; gated by funds at submit
    return methods;
  }, [paymentCodEnabled, paymentBkashEnabled, paymentNagadEnabled]);

  // If the currently selected method was disabled by the admin (or balance ran
  // short), fall back to the first available one so submit never 403s.
  useEffect(() => {
    if (!availableMethods.includes(payment)) {
      setPayment(availableMethods[0] ?? "cod");
    }
  }, [availableMethods, payment]);

  const [paymentReference, setPaymentReference] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [renderTime] = useState(() => Date.now());
  const prefilled = useRef(false);

  /** Updates a field and clears the validation message attached to it. */
  const patch = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: "" } : current));
  };

  /**
   * Field level validation. Values are trimmed here so an all-whitespace or
   * too-short address can never slip through and fail on the server afterwards.
   */
  const validateDetails = () => {
    const found: Record<string, string> = {};
    // Issue 9: require a plausible full name (two words minimum).
    const name = form.name.trim().replace(/\s+/g, " ");
    if (name.length < 3 || !name.includes(" ")) {
      found.name = "Please enter your full name (first and last name).";
    }
    const digits = (form.phone ?? "").replace(/[^0-9]/g, "");
    const normalized =
      digits.startsWith("88") && digits.length === 13 ? digits.slice(2) : digits;
    if (!/^01[3-9]\d{8}$/.test(normalized)) {
      found.phone = "Enter an 11-digit mobile number starting with 01, e.g. 01712345678.";
    }
    if (!form.division) {
      found.division = "Choose the division you want delivery in.";
    }
    const district = (form.district ?? "").trim().replace(/\s+/g, " ");
    if (district.length < 3 || !/[A-Za-z\u0980-\u09FF]/.test(district)) {
      found.district = "Enter a valid district or city name.";
    }
    const address = (form.address ?? "").trim().replace(/\s+/g, " ");
    if (address.length < 10 || !/[A-Za-z\u0980-\u09FF]/.test(address)) {
      found.address = "Enter a complete address with house, road or area details.";
    }
    if (payment !== "cod" && payment !== "balance") {
      const ref = paymentReference.trim();
      const looksLikeTxn = /^[A-Za-z0-9]{6,20}$/.test(ref);
      const looksLikePhone = /^01[3-9]\d{8}$/.test(ref.replace(/\D/g, ""));
      if (!looksLikeTxn && !looksLikePhone) {
        found.paymentReference = `Enter the ${payment === "bkash" ? "bKash" : "Nagad"} transaction ID or the mobile number you paid from.`;
      }
    }
    return found;
  };

  const coupon = useQuery(
    api.coupons.validate,
    appliedCode ? { code: appliedCode, subtotal } : "skip",
  );

  // Prefill saved details + auto-detect the delivery zone from the device timezone.
  useEffect(() => {
    if (prefilled.current || !profile) return;
    prefilled.current = true;
    let detected = "";
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      if (zone.includes("Dhaka")) detected = "Dhaka";
    } catch {
      detected = "";
    }
    setForm((current) => ({
      ...current,
      name: current.name || profile.name || "",
      phone: current.phone || profile.phone || "",
      division: current.division || profile.division || detected,
      district: current.district || profile.district || "",
      address: current.address || profile.address || "",
      resellerCode: current.resellerCode || profile.referralCode || "",
    }));
  }, [profile]);

  const delivery = form.division ? deliveryChargeFor(form.division, subtotal) : 0;
  const discount = coupon?.ok ? coupon.discount : 0;
  const total = Math.max(0, subtotal + delivery - discount);
  const balanceCovers = balance >= total;
  const remaining = Math.max(0, freeDeliveryThreshold - subtotal);

  const districts = useMemo(() => districtsFor(form.division), [form.division]);

  const detectZone = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const division = nearestDivision(
          position.coords.latitude,
          position.coords.longitude,
        );
        setForm((current) => ({ ...current, division }));
        setLocating(false);
        toast.success(`${t("checkout.detected")}: ${division}`);
      },
      () => {
        setLocating(false);
        toast.error("Could not read your location — pick your division instead");
      },
      { timeout: 8000 },
    );
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (items.length === 0) {
      toast.error(t("checkout.emptyBag"));
      return;
    }

    const found = validateDetails();
    setErrors(found);
    const firstInvalid = ["name", "phone", "division", "district", "address"].find(
      (key) => found[key],
    );
    if (firstInvalid) {
      const field = document.getElementById(firstInvalid);
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      field?.focus({ preventScroll: true });
      toast.error(found[firstInvalid]);
      return;
    }

    if (!acceptedTerms) {
      toast.error("Please accept the terms & conditions to place your order.");
      return;
    }

    setBusy(true);
    try {
      const result = await placeOrder({
        customerName: form.name.trim(),
        phone: (() => {
          const digits = (form.phone ?? "").replace(/[^0-9]/g, "");
          return digits.startsWith("88") && digits.length === 13
            ? digits.slice(2)
            : digits;
        })(),
        division: form.division,
        district: (form.district ?? "").trim().replace(/\s+/g, " "),
        address: (form.address ?? "").trim().replace(/\s+/g, " "),
        note: form.note.trim() || undefined,
        couponCode: coupon?.ok ? appliedCode : undefined,
        resellerCode: form.resellerCode.trim() || undefined,
        paymentMethod: payment,
        paymentReference: payment !== "cod" && payment !== "balance" ? paymentReference.trim() || undefined : undefined,
        acceptedTerms,
      });

      const methodLabel =
        payment === "bkash"
          ? "bKash"
          : payment === "nagad"
            ? "Nagad"
            : payment === "balance"
              ? "Store balance"
              : "Cash on delivery";
      toast.success(`${t("checkout.success")} · ${result.orderNumber}`, {
        description: `৳${result.total.toLocaleString()} · ${methodLabel}${payment === "cod" ? " payable on delivery." : "."}`,
      });

      // Outbound channels (customer confirmation email, staff webhook/email) —
      // never block the order on notification failures.
      void dispatchAlert({
        orderNumber: result.orderNumber,
        customerName: form.name,
        phone: form.phone,
        division: form.division,
        total: result.total,
        itemCount: count,
        paymentMethod: payment,
        customerEmail: user?.email ?? undefined,
      }).catch(() => undefined);

      navigate("/orders");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto grid min-h-[60vh] max-w-lg place-items-center px-4">
        <div className="glass w-full rounded-3xl p-8 text-center">
          <h1 className="font-display text-2xl font-semibold">{t("bag.empty")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("checkout.emptyBag")}</p>
          <Button asChild className="mt-6 cursor-pointer rounded-full">
            <Link to="/shop">{t("cta.shopNow")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo title="Checkout" description="Secure cash-on-delivery checkout." />

      <header>
        <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
          Step 2 of 2
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("checkout.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cash on delivery across all 64 districts — pay the courier when your parcel
          arrives.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]"
      >
        <div className="space-y-5">
          <section className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <MapPin className="size-4 text-primary" strokeWidth={1.8} />
                {t("checkout.shipping")}
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={detectZone}
                disabled={locating}
                className="cursor-pointer rounded-full text-xs"
              >
                {locating ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="size-3.5" strokeWidth={1.8} />
                )}
                {t("checkout.detect")}
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("checkout.fullName")}</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  aria-invalid={Boolean(errors.name)}
                  value={form.name}
                  onChange={(event) => patch("name", event.target.value)}
                  className={cn("h-11 rounded-xl", errors.name && "border-destructive")}
                />
                <FieldError message={errors.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("checkout.phone")}</Label>
                <Input
                  id="phone"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="01712345678"
                  aria-invalid={Boolean(errors.phone)}
                  value={form.phone}
                  onChange={(event) => patch("phone", event.target.value)}
                  className={cn("h-11 rounded-xl", errors.phone && "border-destructive")}
                />
                <FieldError message={errors.phone} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="division">{t("checkout.division")}</Label>
                <select
                  id="division"
                  value={form.division}
                  aria-invalid={Boolean(errors.division)}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((current) => ({
                      ...current,
                      division: value,
                      district: "",
                    }));
                    setErrors((current) => ({ ...current, division: "", district: "" }));
                  }}
                  className={cn(
                    "h-11 w-full rounded-xl border border-border/60 bg-card/70 px-3 text-sm",
                    errors.division && "border-destructive",
                  )}
                >
                  <option value="">Select division</option>
                  {BD_DIVISIONS.map((zone) => (
                    <option key={zone.division} value={zone.division}>
                      {zone.division} · {money(zone.charge)} delivery
                    </option>
                  ))}
                </select>
                <FieldError message={errors.division} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">{t("checkout.district")}</Label>
                <Input
                  id="district"
                  list="district-options"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.district)}
                  value={form.district}
                  onChange={(event) => patch("district", event.target.value)}
                  className={cn("h-11 rounded-xl", errors.district && "border-destructive")}
                />
                <datalist id="district-options">
                  {districts.map((district) => (
                    <option key={district} value={district} />
                  ))}
                </datalist>
                <FieldError message={errors.district} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">{t("checkout.address")}</Label>
                <Textarea
                  id="address"
                  autoComplete="street-address"
                  aria-invalid={Boolean(errors.address)}
                  value={form.address}
                  onChange={(event) => patch("address", event.target.value)}
                  placeholder="House / road / area, landmark"
                  className={cn(
                    "min-h-20 rounded-xl",
                    errors.address && "border-destructive",
                  )}
                />
                <FieldError message={errors.address} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note">{t("checkout.note")}</Label>
                <Input
                  id="note"
                  value={form.note}
                  onChange={(event) => patch("note", event.target.value)}
                  placeholder="Delivery instructions, preferred time window…"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="reseller">{t("checkout.resellerCode")}</Label>
                <Input
                  id="reseller"
                  value={form.resellerCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      resellerCode: event.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. NABI4821"
                  className="h-11 rounded-xl uppercase"
                />
              </div>
            </div>
          </section>

          <section className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Payment method
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {/* Only admin-enabled methods render (see availableMethods). */}
              {paymentCodEnabled && (
                <button
                  type="button"
                  onClick={() => setPayment("cod")}
                  className={cn(
                    "cursor-pointer rounded-2xl border p-4 text-left transition-colors",
                    payment === "cod"
                      ? "border-primary bg-brand-blush/60"
                      : "border-border/60 hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Banknote className="size-4 text-primary" strokeWidth={1.8} />
                    {t("checkout.cod")}
                    {payment === "cod" && (
                      <BadgeCheck className="ml-auto size-4 text-primary" strokeWidth={1.8} />
                    )}
                  </span>
                  <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                    {t("checkout.codHint")}
                  </span>
                </button>
              )}
              {([
                { id: "bkash" as const, enabled: paymentBkashEnabled, number: paymentBkashNumber, label: "bKash", color: "text-[#d12053]" },
                { id: "nagad" as const, enabled: paymentNagadEnabled, number: paymentNagadNumber, label: "Nagad", color: "text-[#f6921e]" },
              ] as const)
                .filter((msf) => msf.enabled)
                .map((msf) => (
                  <button
                    key={msf.id}
                    type="button"
                    onClick={() => setPayment(msf.id)}
                    className={cn(
                      "cursor-pointer rounded-2xl border p-4 text-left transition-colors",
                      payment === msf.id
                        ? "border-primary bg-brand-blush/60"
                        : "border-border/60 hover:bg-accent",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <CreditCard className={cn("size-4", msf.color)} strokeWidth={1.8} />
                      {msf.label}
                      {payment === msf.id && (
                        <BadgeCheck className="ml-auto size-4 text-primary" strokeWidth={1.8} />
                      )}
                    </span>
                    <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                      Send payment to {msf.number}, then place the order — we confirm by phone.
                    </span>
                  </button>
                ))}
              {/* Store balance — always offered; funds verified at submit. */}
              <button
                type="button"
                onClick={() => setPayment("balance")}
                className={cn(
                  "cursor-pointer rounded-2xl border p-4 text-left transition-colors",
                  payment === "balance"
                    ? "border-primary bg-brand-blush/60"
                    : "border-border/60 hover:bg-accent",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <Wallet className="size-4 text-primary" strokeWidth={1.8} />
                  Store balance
                  <span className={cn("ml-auto text-xs font-semibold", balance > 0 ? "text-primary" : "text-muted-foreground")}>
                    {money(balance)}
                  </span>
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                  {balanceCovers
                    ? "Pay instantly from your topped-up balance."
                    : balance > 0
                      ? `৳${Math.max(0, total - balance).toLocaleString()} short — top up from your Account page or pay another way.`
                      : "Your balance is empty — top up from the Account page first."}
                </span>
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {payment === "balance" && !balanceCovers && (
                <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
                  Your balance does not cover this order yet. Top up from Account → Store
                  balance, or pick another payment method.
                </div>
              )}
              {payment !== "cod" && payment !== "balance" && (
                <div className="space-y-1.5">
                  <Label htmlFor="paymentReference">
                    {payment === "bkash" ? "bKash" : "Nagad"} transaction ID / sender number
                  </Label>
                  <Input
                    id="paymentReference"
                    inputMode="text"
                    maxLength={60}
                    placeholder={payment === "bkash" ? "e.g. 9F7HK2LM35" : "e.g. 01712345678"}
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sent to <strong>{payment === "bkash" ? paymentBkashNumber : paymentNagadNumber}</strong> · verify before dispatch.
                  </p>
                  {errors.paymentReference && <FieldError message={errors.paymentReference} />}
                </div>
              )}
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 shrink-0 text-primary" strokeWidth={1.8} />
                Your order is verified by phone before dispatch. No card details are ever stored.
              </p>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="glass rounded-3xl p-5">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t("checkout.summary")}
            </h2>

            <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((line) => (
                <div key={line._id} className="flex items-center gap-3">
                  <SmartImage
                    src={line.product.images[0]}
                    alt={line.product.name}
                    width={140}
                    className="size-14 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{line.product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[line.size, line.color].filter(Boolean).join(" · ")} × {line.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {money(
                      (line.product.flashSalePrice &&
                      line.product.flashSaleEndsAt &&
                      line.product.flashSaleEndsAt > renderTime
                        ? line.product.flashSalePrice
                        : line.product.price) * line.quantity,
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-border/50 pt-4">
              <div className="flex gap-2">
                <Input
                  value={codeInput}
                  onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
                  placeholder={t("checkout.coupon")}
                  className="h-11 rounded-xl uppercase"
                />
                {coupon?.ok ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setAppliedCode("");
                      setCodeInput("");
                    }}
                    className="h-11 cursor-pointer rounded-xl px-4"
                  >
                    <X className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAppliedCode(codeInput.trim())}
                    disabled={codeInput.trim().length < 3}
                    className="h-11 cursor-pointer rounded-xl px-4"
                  >
                    {t("checkout.apply")}
                  </Button>
                )}
              </div>
              {coupon && (
                <p
                  className={cn(
                    "mt-2 flex items-center gap-1.5 text-xs",
                    coupon.ok ? "text-primary" : "text-destructive",
                  )}
                >
                  <Tag className="size-3.5" strokeWidth={1.8} />
                  {coupon.ok
                    ? `${coupon.message} · −${money(coupon.discount)}`
                    : coupon.message}
                </p>
              )}
            </div>

            <div className="mt-5 space-y-2.5 border-t border-border/50 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("bag.subtotal")}</span>
                <span className="font-medium">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="size-3.5" strokeWidth={1.8} />
                  {t("bag.delivery")}
                </span>
                <span className="font-medium">
                  {delivery === 0 ? t("common.free") : money(delivery)}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-primary">
                  <span>{t("bag.discount")}</span>
                  <span className="font-medium">−{money(discount)}</span>
                </div>
              )}
            </div>

            {remaining > 0 && form.division && (
              <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-[11px] text-muted-foreground">
                {money(remaining)} away from free delivery
              </p>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
              <span className="text-sm text-muted-foreground">{t("bag.total")}</span>
              <span className="font-display text-2xl font-semibold">{money(total)}</span>
            </div>

            <motion.div whileTap={{ scale: 0.985 }}>
              <Button
                type="submit"
                disabled={busy}
                className="mt-5 h-12 w-full cursor-pointer rounded-full text-sm font-medium"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Banknote className="size-4" strokeWidth={1.8} />
                )}
                {busy ? t("checkout.placing") : t("checkout.placeOrder")}
              </Button>
            </motion.div>

            {/* Issue 8: explicit terms acceptance gate before placing the order. */}
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[11px] leading-4 text-muted-foreground">
              <Checkbox
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                className="mt-0.5 cursor-pointer"
                aria-label="Accept the terms and conditions"
              />
              <span>
                I agree to the{" "}
                <Link
                  to="/legal/terms-conditions"
                  target="_blank"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  terms &amp; conditions
                </Link>{" "}
                and confirm my order details are correct.
              </span>
            </label>

            <Button
              type="button"
              variant="ghost"
              asChild
              className="mt-2 w-full cursor-pointer rounded-full text-xs"
            >
              <Link to="/cart">{t("bag.continueShopping")}</Link>
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}

/** Inline validation message rendered directly under the offending field. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 text-[11px] leading-4 font-medium text-destructive"
    >
      <AlertCircle className="mt-px size-3.5 shrink-0" strokeWidth={1.9} />
      {message}
    </p>
  );
}
