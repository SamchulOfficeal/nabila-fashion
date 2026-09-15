import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { effectivePrice } from "./catalog";
import { getViewer, requireUser } from "./lib/access";

/** Saved pieces for the signed in shopper. */
export const myWishlist = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return [];

    const rows = await ctx.db
      .query("wishlistItems")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);

    const lines: Array<{
      _id: Id<"wishlistItems">;
      product: Doc<"products">;
      price: number;
    }> = [];
    for (const row of rows) {
      const product = await ctx.db.get(row.productId);
      if (!product || !product.isActive) continue;
      lines.push({
        _id: row._id,
        product,
        price: effectivePrice(product),
      });
    }
    return lines.sort((a, b) => a.product.name.localeCompare(b.product.name));
  },
});

/** Product ids in the wishlist, so hearts can render filled state cheaply. */
export const ids = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("wishlistItems")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);
    return rows.map((row) => row.productId);
  },
});

export const toggle = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found.");

    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    }

    await ctx.db.insert("wishlistItems", {
      userId: user._id,
      productId: args.productId,
      addedAt: Date.now(),
    });
    return true;
  },
});

export const remove = mutation({
  args: { itemId: v.id("wishlistItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found.");
    await ctx.db.delete(args.itemId);
  },
});
