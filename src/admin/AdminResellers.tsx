import { Seo } from "@/components/Seo";
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
import { cn, formatDate } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BadgeCheck,
  Banknote,
  Check,
  Loader2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ResellerRow = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  referralCode: string;
  blocked: boolean;
  createdAt: number;
  orderCount: number;
  revenue: number;
  earned: number;
  pending: number;
  balance: number;
  paidOut: number;
};

type PendingRequest = {
  _id: string;
  userId: string;
  name: string;
  referralCode: string;
  amount: number;
  method: string;
  accountNumber: string;
  status: string;
  note?: string;
  createdAt: number;
};

type LedgerRow = {
  _id: string;
  name: string;
  amount: number;
  method: string;
  status: string;
  createdAt: number;
};

type Overview = {
  resellers: ResellerRow[];
  pending: PendingRequest[];
  ledger: LedgerRow[];
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  paid: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-destructive/15 text-destructive",
};

export function AdminResellers() {
  const overview = useQuery<Overview | undefined>(api.reseller.adminOverview);
  const minWithdrawal = useQuery<number>(api.reseller.minWithdrawal);
  const reviewWithdrawal = useMutation(api.reseller.reviewWithdrawal);
  const adjustWallet = useMutation(api.reseller.adjustWallet);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [adjustUser, setAdjustUser] = useState<Id<"users"> | null>(null);
  const [adjustType, setAdjustType] = useState<"topup" | "deduction">("topup");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");

  if (overview === undefined) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { resellers, pending, ledger } = overview;
  const totals = resellers.reduce(
    (acc, row) => ({
      balance: acc.balance + Math.max(0, row.balance),
      pending: acc.pending + row.pending,
      earned: acc.earned + row.earned,
    }),
    { balance: 0, pending: 0, earned: 0 },
  );

  const onReview = async (
    withdrawalId: string,
    decision: "approve" | "reject" | "markPaid",
  ) => {
    setBusyId(withdrawalId);
    try {
      await reviewWithdrawal({ withdrawalId: withdrawalId as Id<"withdrawals">, decision });
      toast.success(
        decision === "approve"
          ? "Request approved — mark it paid once the money is sent."
          : decision === "reject"
            ? "Request rejected."
            : "Marked as paid.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const onAdjust = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!adjustUser) return;
    setBusyId(adjustUser);
    try {
      await adjustWallet({
        userId: adjustUser,
        amount: Number(adjustAmount),
        type: adjustType,
        note: adjustNote || undefined,
      });
      toast.success(
        adjustType === "topup" ? "Wallet topped up" : "Wallet adjusted",
      );
      setAdjustUser(null);
      setAdjustAmount("");
      setAdjustNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Adjustment failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Resellers" />

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Resellers
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Commission wallet per reseller, withdrawal approvals and manual wallet
          adjustments. Balance is derived from delivered orders, so it always matches
          reality.
        </p>
      </div>

      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Resellers
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">{resellers.length}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Wallet balances
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            ৳{totals.balance.toLocaleString()}
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Pending commission
          </p>
          <p className="mt-2 font-display text-2xl font-semibold">
            ৳{totals.pending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Pending withdrawal queue */}
      <section className="glass rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Banknote className="size-4 text-primary" strokeWidth={1.8} />
          Withdrawal requests
          {pending.length > 0 && (
            <Badge className="rounded-full bg-primary text-primary-foreground">
              {pending.length}
            </Badge>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No open requests. Resellers request payouts from their dashboard once they
            hold at least ৳{(minWithdrawal ?? 500).toLocaleString()}.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {pending.map((request) => (
              <li
                key={request._id}
                className="glass-soft flex flex-col gap-3 rounded-2xl p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{request.name}</p>
                    {request.referralCode && (
                      <Badge
                        variant="outline"
                        className="rounded-full text-[10px] uppercase"
                      >
                        {request.referralCode}
                      </Badge>
                    )}
                    <Badge
                      className={cn(
                        "rounded-full border-transparent text-[10px] font-semibold uppercase",
                        STATUS_STYLES[request.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {request.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.method.toUpperCase()} · {request.accountNumber} ·{" "}
                    {formatDate(request.createdAt)}
                    {request.note ? ` · ${request.note}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display text-lg font-semibold text-primary">
                    ৳{request.amount.toLocaleString()}
                  </p>
                  <div className="flex gap-1.5">
                    {request.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="cursor-pointer rounded-full"
                          disabled={busyId === request._id}
                          onClick={() => void onReview(request._id, "approve")}
                        >
                          {busyId === request._id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="cursor-pointer rounded-full"
                          disabled={busyId === request._id}
                          onClick={() => void onReview(request._id, "reject")}
                        >
                          <X className="size-3.5" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === "approved" && (
                      <Button
                        size="sm"
                        className="cursor-pointer rounded-full"
                        disabled={busyId === request._id}
                        onClick={() => void onReview(request._id, "markPaid")}
                      >
                        {busyId === request._id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <BadgeCheck className="size-3.5" />
                        )}
                        Mark paid
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reseller table */}
      <section className="glass overflow-hidden rounded-3xl">
        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-left text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                <th className="px-5 py-3.5 font-semibold">Reseller</th>
                <th className="px-3 py-3.5 font-semibold">Balance</th>
                <th className="px-3 py-3.5 font-semibold">Pending</th>
                <th className="px-3 py-3.5 font-semibold">Earned</th>
                <th className="px-3 py-3.5 font-semibold">Orders</th>
                <th className="px-5 py-3.5 text-right font-semibold">Wallet</th>
              </tr>
            </thead>
            <tbody>
              {resellers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-muted-foreground"
                  >
                    No resellers yet. Promote a customer on the Users &amp; roles page to
                    create one.
                  </td>
                </tr>
              ) : (
                resellers.map((row) => (
                  <tr
                    key={row._id}
                    className="border-b border-border/30 last:border-0"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium">
                        {row.name}
                        {row.blocked && (
                          <span className="ml-2 text-[10px] font-semibold text-destructive uppercase">
                            suspended
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.email || row.phone || "—"} · {row.referralCode || "no code"}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 font-display font-semibold text-primary">
                      ৳{Math.max(0, row.balance).toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">
                      ৳{row.pending.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">
                      ৳{row.earned.toLocaleString()}
                    </td>
                    <td className="px-3 py-3.5 text-muted-foreground">{row.orderCount}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="cursor-pointer rounded-full"
                        onClick={() => {
                          setAdjustUser(row._id as Id<"users">);
                          setAdjustType("topup");
                          setAdjustAmount("");
                          setAdjustNote("");
                        }}
                      >
                        <Wallet className="size-3.5" />
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="space-y-2.5 p-4 md:hidden">
          {resellers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No resellers yet.
            </p>
          ) : (
            resellers.map((row) => (
              <div key={row._id} className="glass-soft rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {row.referralCode || "no code"} · {row.orderCount} orders
                    </p>
                  </div>
                  <p className="font-display font-semibold text-primary">
                    ৳{Math.max(0, row.balance).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Pending ৳{row.pending.toLocaleString()} · earned ৳
                  {row.earned.toLocaleString()}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full cursor-pointer rounded-full"
                  onClick={() => {
                    setAdjustUser(row._id as Id<"users">);
                    setAdjustType("topup");
                    setAdjustAmount("");
                    setAdjustNote("");
                  }}
                >
                  <Wallet className="size-3.5" />
                  Adjust wallet
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Ledger */}
      <section className="glass rounded-3xl p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <TrendingUp className="size-4 text-primary" strokeWidth={1.8} />
          Payout history
        </h2>
        {ledger.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Approved and paid withdrawals will be listed here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border/30">
            {ledger.map((row) => (
              <li
                key={row._id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium">{row.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {" "}
                    · {row.method.toUpperCase()} · {formatDate(row.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="font-medium">৳{row.amount.toLocaleString()}</span>
                  <Badge
                    className={cn(
                      "rounded-full border-transparent text-[10px] font-semibold uppercase",
                      STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {row.status}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Adjust dialog */}
      {adjustUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <form
            onSubmit={onAdjust}
            className="glass-strong w-full max-w-sm rounded-3xl bg-popover p-6 shadow-2xl"
          >
            <h3 className="font-display text-lg font-semibold tracking-tight">
              Adjust wallet
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Manual topup or deduction. Deductions can never push a balance below zero.
            </p>

            <div className="mt-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={adjustType}
                  onValueChange={(value) => setAdjustType(value as typeof adjustType)}
                >
                  <SelectTrigger className="h-10 rounded-xl" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="topup">Topup (add credit)</SelectItem>
                    <SelectItem value="deduction">Deduction (remove credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adj-amount">Amount (৳)</Label>
                <Input
                  id="adj-amount"
                  type="number"
                  min={1}
                  required
                  value={adjustAmount}
                  onChange={(event) => setAdjustAmount(event.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adj-note">Note (optional)</Label>
                <Input
                  id="adj-note"
                  value={adjustNote}
                  onChange={(event) => setAdjustNote(event.target.value)}
                  placeholder="e.g. Weekly bonus"
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 cursor-pointer rounded-full"
                onClick={() => setAdjustUser(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 cursor-pointer rounded-full"
                disabled={busyId === adjustUser}
              >
                {busyId === adjustUser ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
