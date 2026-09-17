import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/services/firebase/api";
import { BD_DIVISIONS } from "@/convex/lib/delivery";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import {
  BadgeCheck,
  Copy,
  Heart,
  LayoutDashboard,
  Loader2,
  LogOut,
  MailCheck,
  Package,
  RefreshCcw,
  Shield,
  Sparkles,
  TrendingUp,
  UserCog,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  manager: "Manager",
  reseller: "Reseller",
  customer: "Customer",
};

export default function Account() {
  const { t, money } = useShop();
  const {
    signOut,
    user,
    emailVerified,
    requestVerificationEmail,
    refreshVerification,
  } = useAuth();
  const profile = useQuery(api.profile.get);
  const saveProfile = useMutation(api.profile.save);
  const reseller = useQuery(api.admin.resellerSummary);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    division: "",
    district: "",
    address: "",
  });
  const [busy, setBusy] = useState(false);
  const prefilled = useRef(false);
  const [verifying, setVerifying] = useState(false);

  const isVerified = emailVerified === true;
  const hasEmail = Boolean(user?.email);

  const handleSendVerification = async () => {
    setVerifying(true);
    try {
      const sent = await requestVerificationEmail();
      toast.success(
        sent
          ? `Verification link sent to ${user?.email}`
          : "This email is already verified.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not send the verification email",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleRefreshVerification = async () => {
    setVerifying(true);
    try {
      const refreshed = await refreshVerification();
      if (refreshed?.emailVerified) {
        toast.success("Email verified — thank you!");
      } else {
        toast.info("Still unverified. Click the link in your inbox first, then retry.");
      }
    } catch (error) {
      toast.error("Could not refresh verification status");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (prefilled.current || !profile) return;
    prefilled.current = true;
    setForm({
      name: profile.name,
      phone: profile.phone,
      division: profile.division,
      district: profile.district,
      address: profile.address,
    });
  }, [profile]);

  if (profile === undefined || profile === null) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isStaff = profile.role === "admin" || profile.role === "manager";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await saveProfile({
        name: form.name,
        phone: form.phone,
        division: form.division || undefined,
        district: form.district || undefined,
        address: form.address || undefined,
      });
      toast.success("Details saved — checkout will prefill them next time");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo title="My account" description="Manage your NABILA FASHION account." />

      <header className="glass rounded-[2rem] p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-blush font-display text-xl font-bold text-primary">
              {(profile.name || profile.email || "N").slice(0, 1).toUpperCase()}
            </span>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
                {t("account.welcome")}
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
                {profile.name || "NABILA customer"}
              </h1>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {profile.email || "Guest session"}
                {hasEmail &&
                  (isVerified ? (
                    <BadgeCheck
                      className="size-3.5 text-emerald-600"
                      strokeWidth={2}
                      aria-label="Email verified"
                    />
                  ) : (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      UNVERIFIED
                    </span>
                  ))}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-transparent bg-primary/12 text-[10px] font-semibold tracking-wide text-primary uppercase">
              {ROLE_LABELS[profile.role] ?? profile.role}
            </Badge>
            {isStaff && (
              <Button asChild size="sm" className="cursor-pointer rounded-full">
                <Link to="/admin">
                  <LayoutDashboard className="size-4" strokeWidth={1.8} />
                  {t("nav.admin")}
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer rounded-full"
              onClick={() => {
                void signOut().then(() => navigate("/"));
              }}
            >
              <LogOut className="size-4" strokeWidth={1.8} /> {t("nav.signOut")}
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Package,
            label: t("nav.orders"),
            to: "/orders",
            hint: "Track deliveries and reorder",
          },
          {
            icon: Heart,
            label: t("nav.wishlist"),
            to: "/wishlist",
            hint: "Pieces you have saved",
          },
          {
            icon: TrendingUp,
            label: t("nav.sale"),
            to: "/shop?flash=1",
            hint: "Live flash deals",
          },
        ].map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="glass lift rounded-3xl p-5"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-blush text-primary">
              <item.icon className="size-5" strokeWidth={1.6} />
            </span>
            <p className="mt-3 font-display text-sm font-semibold tracking-tight">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p>
          </Link>
        ))}
      </div>

      {profile.role === "reseller" && reseller && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t("account.reseller")}
            </h2>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t("account.resellerHint")}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {t("account.referral")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-display text-xl font-semibold tracking-wide">
                  {reseller.referralCode || "—"}
                </span>
                {reseller.referralCode && (
                  <button
                    type="button"
                    aria-label="Copy referral code"
                    onClick={() => {
                      void navigator.clipboard.writeText(reseller.referralCode);
                      toast.success("Referral code copied");
                    }}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-primary"
                  >
                    <Copy className="size-3.5" strokeWidth={1.8} />
                  </button>
                )}
              </div>
            </div>
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {t("account.commission")}
              </p>
              <p className="mt-2 font-display text-xl font-semibold">
                {money(reseller.commission)}
              </p>
            </div>
            <div className="glass-soft rounded-2xl p-4">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Referred orders
              </p>
              <p className="mt-2 font-display text-xl font-semibold">
                {reseller.orders}
              </p>
            </div>
          </div>
          {reseller.recent.length > 0 && (
            <div className="mt-4 space-y-2">
              {reseller.recent.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-xs odd:bg-muted/60"
                >
                  <span className="font-medium">{order.orderNumber}</span>
                  <span className="text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </span>
                  <span className="font-medium text-primary">
                    +{money(order.commission)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-3xl p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <UserCog className="size-4 text-primary" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {t("account.profile")}
            </h2>
          </div>
          <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">{t("checkout.fullName")}</Label>
              <Input
                id="acc-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-phone">{t("checkout.phone")}</Label>
              <Input
                id="acc-phone"
                inputMode="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-division">{t("checkout.division")}</Label>
              <select
                id="acc-division"
                value={form.division}
                onChange={(event) =>
                  setForm((current) => ({ ...current, division: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-border/60 bg-card/70 px-3 text-sm"
              >
                <option value="">Select division</option>
                {BD_DIVISIONS.map((zone) => (
                  <option key={zone.division} value={zone.division}>
                    {zone.division}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-district">{t("checkout.district")}</Label>
              <Input
                id="acc-district"
                value={form.district}
                onChange={(event) =>
                  setForm((current) => ({ ...current, district: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="acc-address">{t("checkout.address")}</Label>
              <Input
                id="acc-address"
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                className="h-11 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                disabled={busy}
                className="cursor-pointer rounded-full px-6"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {t("account.save")}
              </Button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          {hasEmail && (
            <div className="glass rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <MailCheck className="size-4 text-primary" strokeWidth={1.8} />
                <h2 className="font-display text-base font-semibold tracking-tight">
                  Email verification
                </h2>
              </div>
              {isVerified ? (
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <BadgeCheck className="size-4 text-emerald-600" strokeWidth={2} />
                  Your email is verified. Order updates land in your inbox.
                </p>
              ) : (
                <>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Verify <strong className="text-foreground">{user?.email}</strong> so
                    you can reset your password and receive order confirmations. Click
                    the link in your inbox, then press refresh here.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={verifying}
                      onClick={() => void handleSendVerification()}
                      className="cursor-pointer rounded-full"
                    >
                      {verifying ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <MailCheck className="size-4" strokeWidth={1.8} />
                      )}
                      Send verification link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={verifying}
                      onClick={() => void handleRefreshVerification()}
                      className="cursor-pointer rounded-full"
                    >
                      <RefreshCcw className="size-4" strokeWidth={1.8} />
                      I verified — refresh
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-primary" strokeWidth={1.8} />
              <h2 className="font-display text-base font-semibold tracking-tight">
                Security
              </h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
              <li>Sign-in is protected by a 6-digit email OTP.</li>
              <li>Role based access control guards every admin route.</li>
              <li>Delivery charges, stock and totals are recalculated on the server.</li>
            </ul>
          </div>

        </div>
      </section>
    </div>
  );
}
