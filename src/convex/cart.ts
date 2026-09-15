import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { effectivePrice } from "./catalog";
import { getViewer, requireUser } from "./lib/access";

const MAX_CART_LINES = 40;

type CartLine = {
  _id: Doc<"cartItems">["_id"];
  quantity: number;
  size?: string;
  color?: string;
  product: Doc<"products">;
};

/** Cart lines for the signed in shopper, joined with live product data. */
export const myCart = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return [];

    const rows = await ctx.db
      .query("cartItems")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);

    const lines: CartLine[] = [];

    for (const row of rows) {
      const product = await ctx.db.get(row.productId);
      if (!product || !product.isActive) continue;
      lines.push({
        _id: row._id,
        quantity: row.quantity,
        size: row.size,
        color: row.color,
        product,
      });
    }

    return lines.sort((a, b) => a._id.localeCompare(b._id));
  },
});

/** Lightweight badge counter used by the header + bottom navigation. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return { count: 0, subtotal: 0, lines: 0 };

    const rows = await ctx.db
      .query("cartItems")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);

    let count = 0;
    let subtotal = 0;
    let lines = 0;
    for (const row of rows) {
      const product = await ctx.db.get(row.productId);
      if (!product || !product.isActive) continue;
      count += row.quantity;
      subtotal += effectivePrice(product) * row.quantity;
      lines += 1;
    }
    return { count, subtotal, lines };
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.optional(v.number()),
    size: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) {
      throw new Error("This piece is no longer available.");
    }
    if (product.stock <= 0) throw new Error("This piece is sold out.");

    const size = args.size ?? product.sizes[0];
    const color = args.color ?? product.colors[0];
    if (size && !product.sizes.includes(size)) {
      throw new Error("That size is not available for this piece.");
    }
    if (color && !product.colors.includes(color)) {
      throw new Error("That colour is not available for this piece.");
    }

    const existingRows = await ctx.db
      .query("cartItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .take(20);
    const existing = existingRows.find(
      (row) => (row.size ?? "") === (size ?? "") && (row.color ?? "") === (color ?? ""),
    );

    const requested = Math.max(1, Math.round(args.quantity ?? 1));

    if (existing) {
      const next = Math.min(existing.quantity + requested, product.stock, 10);
      await ctx.db.patch(existing._id, { quantity: next });
      return existing._id;
    }

    const currentLines = (
      await ctx.db
        .query("cartItems")
        .withIndex("userId", (q) => q.eq("userId", user._id))
        .take(200)
    ).length;
    if (currentLines >= MAX_CART_LINES) {
      throw new Error("Your bag is full. Please check out or remove a piece.");
    }

    return await ctx.db.insert("cartItems", {
      userId: user._id,
      productId: args.productId,
      quantity: Math.min(requested, product.stock, 10),
      size,
      color,
      addedAt: Date.now(),
    });
  },
});

export const updateQuantity = mutation({
  args: { itemId: v.id("cartItems"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found in your bag.");
    if (args.quantity <= 0) {
      await ctx.db.delete(args.itemId);
      return;
    }
    const product = await ctx.db.get(item.productId);
    const ceiling = Math.min(product?.stock ?? 10, 10);
    await ctx.db.patch(args.itemId, {
      quantity: Math.max(1, Math.min(Math.round(args.quantity), ceiling)),
    });
  },
});

export const remove = mutation({
  args: { itemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== user._id) throw new Error("Item not found in your bag.");
    await ctx.db.delete(args.itemId);
  },
});

export const clear = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("cartItems")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);
    for (const row of rows) await ctx.db.delete(row._id);
  },
});
