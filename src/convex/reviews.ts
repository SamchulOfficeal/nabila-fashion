import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanText, getViewer, requireUser } from "./lib/access";

export const forProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("productId", (q) => q.eq("productId", args.productId))
      .take(80);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** A review is only allowed after a real, non-cancelled order for that piece. */
export const canReview = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (!user) return { allowed: false, reason: "signin" as const };

    const existing = await ctx.db
      .query("reviews")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(100);
    if (existing.some((review) => review.productId === args.productId)) {
      return { allowed: false, reason: "already" as const };
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(100);
    const purchased = orders.some(
      (order) =>
        order.status !== "cancelled" &&
        order.items.some((item) => item.productId === args.productId),
    );

    return purchased
      ? { allowed: true, reason: "ok" as const }
      : { allowed: false, reason: "purchase" as const };
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");

    const rating = Math.round(args.rating);
    if (rating < 1 || rating > 5) throw new Error("Choose a rating between 1 and 5.");
    const comment = cleanText(args.comment, 600);
    if (comment.length < 4) throw new Error("Please write a short review.");

    const existing = await ctx.db
      .query("reviews")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(100);
    if (existing.some((review) => review.productId === args.productId)) {
      throw new Error("You have already reviewed this piece.");
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(100);
    const purchased = orders.some(
      (order) =>
        order.status !== "cancelled" &&
        order.items.some((item) => item.productId === args.productId),
    );
    if (!purchased) {
      throw new Error("Only verified buyers can review this piece.");
    }

    await ctx.db.insert("reviews", {
      productId: args.productId,
      userId: user._id,
      authorName: user.name ?? "Customer",
      rating,
      comment,
      createdAt: Date.now(),
    });

    const all = await ctx.db
      .query("reviews")
      .withIndex("productId", (q) => q.eq("productId", args.productId))
      .take(200);
    const average =
      all.reduce((sum, review) => sum + review.rating, 0) / Math.max(all.length, 1);

    await ctx.db.patch(args.productId, {
      rating: Math.round(average * 10) / 10,
      reviewCount: all.length,
    });
  },
});

export const staffRemove = mutation({
  args: { id: v.id("reviews") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "admin" && user.role !== "manager") {
      throw new Error("You do not have access to moderate reviews.");
    }
    const review = await ctx.db.get(args.id);
    if (!review) return;
    await ctx.db.delete(args.id);

    const remaining = await ctx.db
      .query("reviews")
      .withIndex("productId", (q) => q.eq("productId", review.productId))
      .take(200);
    const average =
      remaining.reduce((sum, item) => sum + item.rating, 0) / Math.max(remaining.length, 1);
    await ctx.db.patch(review.productId, {
      rating: remaining.length === 0 ? 0 : Math.round(average * 10) / 10,
      reviewCount: remaining.length,
    });
  },
});
