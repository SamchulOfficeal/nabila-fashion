import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  cleanText,
  getViewer,
  requireAdmin,
  requireUser,
  roleOf,
} from "./lib/access";

/**
 * Phase B — Reseller wallet.
 *
 * Balance is DERIVED, never stored, so it can never drift out of sync:
 *
 *   balance = Σ(commission on delivered orders)
 *           + Σ(admin topups)  −  Σ(withdrawals marked paid)
 *           −  Σ(approved withdrawals, held until marked paid)
 *
 * Pending = commission on live (non-delivered, non-cancelled) referred orders.
 * Cancelled orders contribute nothing; delivered orders contribute everything —
 * no status-change hook is needed, re-derivation handles every transition.
 */

const EARNED_STATUSES = new Set(["delivered"]);
const HELD_STATUSES = new Set(["approved"]); // reserved but not yet disbursed
const LIVE_STATUSES = new Set(["pending", "confirmed", "processing", "shipped"]);

function computeWallet(
  orders: { status: string; commission?: number; resellerId?: string }[],
  adjustments: { amount: number }[],
  withdrawals: { amount: number; status: string }[],
) {
  let earned = 0;
  let pending = 0;
  for (const order of orders) {
    const commission = order.commission ?? 0;
    if (EARNED_STATUSES.has(order.status)) {
      earned += commission;
    } else if (LIVE_STATUSES.has(order.status)) {
      pending += commission;
    }
    // cancelled contributes nothing.
  }

  const adjustmentsTotal = adjustments.reduce((sum, row) => sum + row.amount, 0);
  const paidOut = withdrawals
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.amount, 0);
  const held = withdrawals
    .filter((row) => HELD_STATUSES.has(row.status))
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    earned,
    pending,
    adjustments: adjustmentsTotal,
    paidOut,
    held,
    // Spendable now: delivered commission + admin topups − settled payouts − reserved approvals.
    balance: earned + adjustmentsTotal - paidOut - held,
  };
}

/** Wallet + referred-order stats for the signed-in reseller. */
export const myWallet = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;

    const orders = (await ctx.db.query("orders").take(300)).filter(
      (order) => order.resellerId !== undefined && order.resellerId === user._id,
    );
    const adjustments = (
      await ctx.db.query("walletAdjustments").withIndex("userId", (q) => q.eq("userId", user._id)).take(200)
    );
    const withdrawals = (
      await ctx.db.query("withdrawals").withIndex("userId", (q) => q.eq("userId", user._id)).take(200)
    );

    const wallet = computeWallet(orders, adjustments, withdrawals);
    const liveOrders = orders.filter(
      (order) => EARNED_STATUSES.has(order.status) || LIVE_STATUSES.has(order.status),
    );
    const revenue = liveOrders.reduce((sum, order) => sum + order.total, 0);

    const recent = orders
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20)
      .map((order) => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        commission: order.commission ?? 0,
        status: order.status,
        createdAt: order.createdAt,
      }));

    const requests = withdrawals
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((row) => ({
        _id: row._id,
        amount: row.amount,
        method: row.method,
        accountNumber: row.accountNumber,
        status: row.status,
        note: row.note,
        createdAt: row.createdAt,
      }));

    return {
      role: roleOf(user),
      referralCode: user.referralCode ?? "",
      ...wallet,
      revenue,
      orderCount: liveOrders.length,
      recent,
      requests,
    };
  },
});

/** Withdrawal floor (৳) configured by the admin in Settings. */
async function readMinWithdrawal(ctx: Parameters<typeof requireUser>[0]) {
  try {
    const row = await ctx.db
      .query("settings")
      .withIndex("key", (q) => q.eq("key", "resellerMinWithdrawal"))
      .first();
    const value = Number(row?.value);
    return Number.isFinite(value) && value >= 0 ? value : 500;
  } catch {
    return 500;
  }
}

export const minWithdrawal = query({
  args: {},
  handler: async (ctx) => {
    return await readMinWithdrawal(ctx);
  },
});

/** Reseller asks for a payout of part of their available balance. */
export const requestWithdrawal = mutation({
  args: {
    amount: v.number(),
    method: v.union(v.literal("bkash"), v.literal("nagad"), v.literal("bank")),
    accountNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (roleOf(user) !== "reseller") {
      throw new Error("Only approved resellers can request a withdrawal.");
    }

    const amount = Math.round(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid withdrawal amount.");
    }

    const accountNumber = cleanText(args.accountNumber, 40).replace(/\s+/g, "");
    if (accountNumber.length < 8) {
      throw new Error(
        "Enter the account number to pay into (bKash/Nagad number or bank account).",
      );
    }

    const minimum = await readMinWithdrawal(ctx);
    if (amount < minimum) {
      throw new Error(`Minimum withdrawal amount is ৳${minimum.toLocaleString()}.`);
    }

    const orders = (await ctx.db.query("orders").take(300)).filter(
      (order) => order.resellerId === user._id,
    );
    const adjustments = await ctx.db
      .query("walletAdjustments")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);
    const withdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);

    const wallet = computeWallet(orders, adjustments, withdrawals);
    if (amount > wallet.balance) {
      throw new Error(
        `Insufficient balance. Available: ৳${Math.max(0, wallet.balance).toLocaleString()}.`,
      );
    }

    const createdAt = Date.now();
    await ctx.db.insert("withdrawals", {
      userId: user._id,
      amount,
      method: args.method,
      accountNumber,
      status: "pending",
      createdAt,
    });

    await ctx.db.insert("notifications", {
      type: "message",
      title: "New withdrawal request",
      message: `${user.name ?? user.email ?? "Reseller"} requested ৳${amount.toLocaleString()} via ${args.method}.`,
      isRead: false,
      createdAt,
    });

    return { ok: true };
  },
});

/** Admin approves a pending request — amount stays held until marked paid. */
export const reviewWithdrawal = mutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    decision: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("markPaid"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const row = await ctx.db.get(args.withdrawalId);
    if (!row) throw new Error("Withdrawal request not found.");

    if (args.decision === "approve") {
      if (row.status !== "pending") {
        throw new Error("Only pending requests can be approved.");
      }
      await ctx.db.patch(row._id, {
        status: "approved",
        note: args.note ? cleanText(args.note, 160) : row.note,
        reviewedBy: admin._id,
        reviewedAt: Date.now(),
      });
      return { ok: true };
    }

    if (args.decision === "reject") {
      if (row.status === "paid") {
        throw new Error("Paid withdrawals cannot be rejected.");
      }
      await ctx.db.patch(row._id, {
        status: "rejected",
        note: args.note ? cleanText(args.note, 160) : row.note,
        reviewedBy: admin._id,
        reviewedAt: Date.now(),
      });
      return { ok: true };
    }

    // markPaid
    if (row.status !== "approved") {
      throw new Error("Approve the request before marking it paid.");
    }
    await ctx.db.patch(row._id, {
      status: "paid",
      note: args.note ? cleanText(args.note, 160) : row.note,
      reviewedBy: admin._id,
      reviewedAt: Date.now(),
    });
    return { ok: true };
  },
});

/** Admin adds or removes wallet credit (topup / deduction) for a reseller. */
export const adjustWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("topup"), v.literal("deduction")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("Reseller not found.");

    const amount = Math.round(Math.abs(args.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid amount.");
    }

    const signed = args.type === "topup" ? amount : -amount;
    if (args.type === "deduction") {
      // Never let a deduction drive the derived balance below zero.
      const orders = (await ctx.db.query("orders").take(300)).filter(
        (order) => order.resellerId === target._id,
      );
      const adjustments = await ctx.db
        .query("walletAdjustments")
        .withIndex("userId", (q) => q.eq("userId", target._id))
        .take(200);
      const withdrawals = await ctx.db
        .query("withdrawals")
        .withIndex("userId", (q) => q.eq("userId", target._id))
        .take(200);
      const wallet = computeWallet(orders, adjustments, withdrawals);
      if (wallet.balance < amount) {
        throw new Error(
          `Cannot deduct more than the available balance (৳${Math.max(0, wallet.balance).toLocaleString()}).`,
        );
      }
    }

    await ctx.db.insert("walletAdjustments", {
      userId: target._id,
      amount: signed,
      type: args.type,
      note: args.note ? cleanText(args.note, 160) : undefined,
      createdBy: admin._id,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/** Admin: every reseller with derived balance + request counts, plus pending queue. */
export const adminOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = (await ctx.db.query("users").take(500)).filter(
      (user) => roleOf(user) === "reseller",
    );
    const orders = await ctx.db.query("orders").take(300);
    const adjustments = await ctx.db.query("walletAdjustments").take(500);
    const withdrawals = await ctx.db.query("withdrawals").take(500);

    const resellers = users
      .map((user) => {
        const myOrders = orders.filter(
          (order) => order.resellerId === user._id,
        );
        const myAdjustments = adjustments.filter(
          (row) => row.userId === user._id,
        );
        const myWithdrawals = withdrawals.filter(
          (row) => row.userId === user._id,
        );
        const wallet = computeWallet(myOrders, myAdjustments, myWithdrawals);
        return {
          _id: user._id,
          name: user.name ?? "Unnamed",
          email: user.email ?? "",
          phone: user.phone ?? "",
          referralCode: user.referralCode ?? "",
          blocked: user.blocked ?? false,
          createdAt: user._creationTime,
          orderCount: myOrders.filter(
            (order) =>
              EARNED_STATUSES.has(order.status) || LIVE_STATUSES.has(order.status),
          ).length,
          revenue: myOrders
            .filter(
              (order) =>
                EARNED_STATUSES.has(order.status) ||
                LIVE_STATUSES.has(order.status),
            )
            .reduce((sum, order) => sum + order.total, 0),
          ...wallet,
        };
      })
      .sort((a, b) => b.earned - a.earned);

    const pending = withdrawals
      .filter((row) => row.status === "pending" || row.status === "approved")
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => {
        const owner = users.find((user) => user._id === row.userId);
        return {
          _id: row._id,
          userId: row.userId,
          name: owner?.name ?? "Reseller",
          referralCode: owner?.referralCode ?? "",
          amount: row.amount,
          method: row.method,
          accountNumber: row.accountNumber,
          status: row.status,
          note: row.note,
          createdAt: row.createdAt,
        };
      });

    const ledger = withdrawals
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30)
      .map((row) => {
        const owner = users.find((user) => user._id === row.userId);
        return {
          _id: row._id,
          name: owner?.name ?? "Reseller",
          amount: row.amount,
          method: row.method,
          status: row.status,
          createdAt: row.createdAt,
        };
      });

    return { resellers, pending, ledger };
  },
});
