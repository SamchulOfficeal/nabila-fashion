import { Seo } from "@/components/Seo";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { cn, formatDate } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  BadgeCheck,
  Copy,
  Loader2,
  Share2,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Wallet = {
  referralCode: string;
  earned: number;
  pending: number;
  balance: number;
  paidOut: number;
  revenue: number;
  orderCount: number;
  recent: {
    _id: string;
    orderNumber: string;
    total: number;
    commission: number;
    status: string;
    createdAt: number;
  }[];
  requests: {
    _id: string;
    amount: number;
    method: string;
    accountNumber: string;
    status: string;
    note?: string;
    createdAt: number;
  }[];
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  processing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  shipped: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

export default function ResellerDashboard() {
  const { money, storeName } = useShop();
  const wallet = useQuery<Wallet | null>(api.reseller.myWallet);
  const minWithdrawal = useQuery<number>(api.reseller.minWithdrawal);
  const requestWithdrawal = useMutation(api.reseller.requestWithdrawal);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bkash" | "nagad" | "bank">("bkash");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  const minimum = minWithdrawal ?? 500;
  const shareLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/shop?ref=${wallet?.referralCode ?? ""}`;
  }, [wallet?.referralCode]);

  if (wallet === undefined) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (wallet === null) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sign in required"
        description="Sign in with your reseller account to see your commission wallet."
        actionLabel="Sign in"
        onAction={() => {
          window.location.href = "/auth?returnTo=/reseller/dashboard";
        }}
      />
    );
  }

  const code = wallet.referralCode || "—";
  const canWithdraw = wallet.balance >= minimum;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Referral code copied");
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied");
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  const onWithdraw = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await requestWithdrawal({
        amount: Number(amount),
        method,
        accountNumber: account,
      });
      toast.success("Withdrawal request sent — we'll review it shortly.");
      setAmount("");
      setAccount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    {
      label: "Available balance",
      value: money(Math.max(0, wallet.balance)),
      hint: `Withdrawable above ${money(minimum)}`,
      icon: Wallet,
    },
    {
      label: "Pending commission",
      value: money(wallet.pending),
      hint: "Confirms on delivery",
      icon: TrendingUp,
    },
    {
      label: "Lifetime earned",
      value: money(wallet.earned),
      hint: `${money(wallet.paidOut)} paid out`,
      icon: BadgeCheck,
    },
    {
      label: "Referred revenue",
      value: money(wallet.revenue),
      hint: `${wallet.orderCount} order${wallet.orderCount === 1 ? "" : "s"}`,
      icon: ShoppingBag,
    },
  ];

  return (
    <div className="space-y-5">
      <Seo title="Reseller dashboard" />

      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass relative overflow-hidden rounded-[2rem] p-6 sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-10 size-64 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
              {storeName.replace(/\s*FASHION$/i, "")} · Reseller
            </span>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Commission wallet
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="rounded-full font-display text-sm font-semibold tracking-[0.14em] uppercase"
              >
                {code}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full"
                onClick={() => void copyCode()}
              >
                <Copy className="size-3.5" /> Copy code
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer rounded-full"
                onClick={() => void copyLink()}
              >
                <Share2 className="size-3.5" /> Copy share link
              </Button>
            </div>
            <p className="mt-3 max-w-xl text-xs leading-5 text-muted-foreground">
              Customers enter your code at checkout — commission is calculated per product
              and becomes withdrawable once the parcel is delivered.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="glass rounded-3xl p-4 sm:p-5"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-brand-blush text-primary">
              <stat.icon className="size-4" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {stat.label}
            </p>
            <p className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        {/* Withdraw form */}
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <ArrowDownToLine className="size-4 text-primary" strokeWidth={1.8} />
            Request a withdrawal
          </h2>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            Minimum {money(minimum)} · paid via bKash, Nagad or bank transfer after admin
            review.
          </p>

          {canWithdraw ? (
            <form onSubmit={onWithdraw} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="wd-amount">Amount (৳)</Label>
                <Input
                  id="wd-amount"
                  type="number"
                  min={minimum}
                  max={Math.max(0, wallet.balance)}
                  step={1}
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder={String(minimum)}
                  className="h-11 rounded-xl"
                />
                <p className="text-[11px] text-muted-foreground">
                  Available: {money(Math.max(0, wallet.balance))}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Payout method</Label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value as typeof method)}
                >
                  <SelectTrigger className="h-11 rounded-xl" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="bank">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wd-account">Account number</Label>
                <Input
                  id="wd-account"
                  required
                  value={account}
                  onChange={(event) => setAccount(event.target.value)}
                  placeholder={method === "bank" ? "Bank account number" : "01XXXXXXXXX"}
                  className="h-11 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full cursor-pointer rounded-full font-medium"
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Request withdrawal"
                )}
              </Button>
            </form>
          ) : (
            <div className="glass-soft mt-5 rounded-2xl p-4 text-sm text-muted-foreground">
              You need at least {money(minimum)} available to request a payout. Keep
              sharing your code — commission is added as soon as an order is delivered.
            </div>
          )}

          {wallet.requests.length > 0 && (
            <div className="mt-6">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                Recent requests
              </p>
              <ul className="mt-2.5 space-y-2">
                {wallet.requests.slice(0, 5).map((request) => (
                  <li
                    key={request._id}
                    className="glass-soft flex items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-xs"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">
                        {money(request.amount)} · {request.method}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </span>
                    </span>
                    <Badge
                      className={cn(
                        "rounded-full border-transparent text-[10px] font-semibold uppercase",
                        REQUEST_STATUS_STYLES[request.status] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {request.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Referred orders */}
        <div className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <ShoppingBag className="size-4 text-primary" strokeWidth={1.8} />
            Referred orders
          </h2>
          {wallet.recent.length === 0 ? (
            <div className="glass-soft mt-4 rounded-2xl p-6 text-center text-sm text-muted-foreground">
              No referred orders yet. Share your code and your first commission will show
              up here the moment an order is placed.
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {wallet.recent.map((order) => (
                <li
                  key={order._id}
                  className="glass-soft flex flex-col gap-2 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold tracking-tight">
                      {order.orderNumber}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(order.createdAt)} · order value {money(order.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">
                      +{money(order.commission)}
                    </span>
                    <Badge
                      className={cn(
                        "rounded-full border-transparent text-[10px] font-semibold capitalize",
                        ORDER_STATUS_STYLES[order.status] ??
                          "bg-muted text-muted-foreground",
                      )}
                    >
                      {order.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
