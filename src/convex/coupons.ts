import { v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { cleanText, requireStaff } from "./lib/access";

export type AppliedCoupon = {
  code: string;
  discount: number;
  description?: string;
};

/**
 * Shared coupon resolver. Used by `placeOrder` (authoritative, server side) and by
 * the checkout preview query. Throws a human readable error when invalid.
 */
export async function resolveCoupon(
  ctx: QueryCtx | MutationCtx,
  rawCode: string,
  subtotal: number,
): Promise<AppliedCoupon | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  const coupon = await ctx.db
    .query("coupons")
    .withIndex("code", (q) => q.eq("code", code))
    .first();

  if (!coupon || !coupon.isActive) throw new Error("This coupon code is not valid.");
  if (coupon.expiresAt !== undefined && coupon.expiresAt < Date.now()) {
    throw new Error("This coupon has expired.");
  }
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    throw new Error("This coupon has already been fully redeemed.");
  }
  if (subtotal < coupon.minSpend) {
    throw new Error(`Add ৳${coupon.minSpend - subtotal} more to use this coupon.`);
  }

  const discount =
    coupon.type === "percent"
      ? Math.round((subtotal * coupon.value) / 100)
      : Math.min(coupon.value, subtotal);

  return {
    code: coupon.code,
    discount,
    description: coupon.description,
  };
}

/** Checkout preview — returns the discount instead of throwing. */
export const validate = query({
  args: { code: v.string(), subtotal: v.number() },
  handler: async (ctx, args) => {
    try {
      const applied = await resolveCoupon(ctx, args.code, args.subtotal);
      if (!applied) return { ok: false, discount: 0, message: "Enter a code." };
      return { ok: true, discount: applied.discount, message: "Coupon applied" };
    } catch (error) {
      return {
        ok: false,
        discount: 0,
        message: error instanceof Error ? error.message : "Invalid coupon.",
      };
    }
  },
});

export const active = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("coupons").take(100);
    return rows.filter((row) => row.isActive);
  },
});

export const staffList = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("coupons").take(200);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const create = mutation({
  args: {
    code: v.string(),
    description: v.optional(v.string()),
    type: v.union(v.literal("percent"), v.literal("fixed")),
    value: v.number(),
    minSpend: v.number(),
    expiresAt: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const code = cleanText(args.code, 24).toUpperCase().replace(/\s+/g, "");
    if (code.length < 3) throw new Error("Coupon code must be at least 3 characters.");
    if (args.value <= 0) throw new Error("Discount value must be greater than zero.");
    if (args.type === "percent" && args.value > 90) {
      throw new Error("Percentage discounts are capped at 90%.");
    }

    const existing = await ctx.db
      .query("coupons")
      .withIndex("code", (q) => q.eq("code", code))
      .first();
    if (existing) throw new Error("That coupon code already exists.");

    return await ctx.db.insert("coupons", {
      code,
      description: args.description ? cleanText(args.description, 120) : undefined,
      type: args.type,
      value: Math.round(args.value),
      minSpend: Math.max(0, Math.round(args.minSpend)),
      isActive: true,
      expiresAt: args.expiresAt,
      usageLimit: args.usageLimit,
      usedCount: 0,
      createdAt: Date.now(),
    });
  },
});

export const setActive = mutation({
  args: { id: v.id("coupons"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.patch(args.id, { isActive: args.isActive });
  },
});

export const remove = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.delete(args.id);
  },
});
