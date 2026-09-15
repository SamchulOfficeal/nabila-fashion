import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { cleanText, requireStaff, slugify } from "./lib/access";

const MAX_SCAN = 300;

const sortValidator = v.union(
  v.literal("newest"),
  v.literal("price-asc"),
  v.literal("price-desc"),
  v.literal("rating"),
  v.literal("popular"),
);

const productInputValidator = {
  name: v.string(),
  nameBn: v.optional(v.string()),
  description: v.string(),
  descriptionBn: v.optional(v.string()),
  categorySlug: v.string(),
  price: v.number(),
  compareAtPrice: v.optional(v.number()),
  images: v.array(v.string()),
  sizes: v.array(v.string()),
  colors: v.array(v.string()),
  tags: v.array(v.string()),
  stock: v.number(),
  sku: v.optional(v.string()),
  isActive: v.boolean(),
  isFeatured: v.boolean(),
  flashSalePrice: v.optional(v.number()),
  flashSaleEndsAt: v.optional(v.number()),
  resellerCommission: v.optional(v.number()),
};

/** A product's live price when a flash sale is running. */
export function effectivePrice(product: Doc<"products">, now = Date.now()): number {
  if (
    product.flashSalePrice !== undefined &&
    product.flashSaleEndsAt !== undefined &&
    product.flashSaleEndsAt > now
  ) {
    return product.flashSalePrice;
  }
  return product.price;
}

export const list = query({
  args: {
    category: v.optional(v.string()),
    search: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    sizes: v.optional(v.array(v.string())),
    colors: v.optional(v.array(v.string())),
    sort: v.optional(sortValidator),
    flashSaleOnly: v.optional(v.boolean()),
    featuredOnly: v.optional(v.boolean()),
    inStockOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const products = await ctx.db
      .query("products")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .take(MAX_SCAN);

    let items = products;

    if (args.category) {
      items = items.filter((p) => p.categorySlug === args.category);
    }
    if (args.featuredOnly) {
      items = items.filter((p) => p.isFeatured);
    }
    if (args.flashSaleOnly) {
      items = items.filter(
        (p) =>
          p.flashSalePrice !== undefined &&
          p.flashSaleEndsAt !== undefined &&
          p.flashSaleEndsAt > now,
      );
    }
    if (args.inStockOnly) {
      items = items.filter((p) => p.stock > 0);
    }
    if (args.search && args.search.trim().length > 0) {
      const term = args.search.trim().toLowerCase();
      items = items.filter((p) => {
        const haystack = [
          p.name,
          p.nameBn ?? "",
          p.categorySlug,
          p.sku ?? "",
          ...p.tags,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }
    if (args.sizes && args.sizes.length > 0) {
      items = items.filter((p) => p.sizes.some((s) => args.sizes!.includes(s)));
    }
    if (args.colors && args.colors.length > 0) {
      items = items.filter((p) => p.colors.some((c) => args.colors!.includes(c)));
    }
    if (args.minPrice !== undefined) {
      items = items.filter((p) => effectivePrice(p, now) >= args.minPrice!);
    }
    if (args.maxPrice !== undefined) {
      items = items.filter((p) => effectivePrice(p, now) <= args.maxPrice!);
    }

    switch (args.sort ?? "newest") {
      case "price-asc":
        items = [...items].sort(
          (a, b) => effectivePrice(a, now) - effectivePrice(b, now),
        );
        break;
      case "price-desc":
        items = [...items].sort(
          (a, b) => effectivePrice(b, now) - effectivePrice(a, now),
        );
        break;
      case "rating":
        items = [...items].sort((a, b) => b.rating - a.rating);
        break;
      case "popular":
        items = [...items].sort((a, b) => b.soldCount - a.soldCount);
        break;
      default:
        items = [...items].sort((a, b) => b.createdAt - a.createdAt);
    }

    return items.slice(0, args.limit ?? 60);
  },
});

export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("isFeatured", (q) => q.eq("isFeatured", true))
      .take(MAX_SCAN);
    return products
      .filter((p) => p.isActive)
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, args.limit ?? 8);
  },
});

export const flashSales = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const products = await ctx.db
      .query("products")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .take(MAX_SCAN);
    return products
      .filter(
        (p) =>
          p.flashSalePrice !== undefined &&
          p.flashSaleEndsAt !== undefined &&
          p.flashSaleEndsAt > now,
      )
      .sort((a, b) => (a.flashSaleEndsAt ?? 0) - (b.flashSaleEndsAt ?? 0))
      .slice(0, 8);
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const related = query({
  args: { categorySlug: v.string(), excludeId: v.optional(v.id("products")) },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("categorySlug", (q) => q.eq("categorySlug", args.categorySlug))
      .take(MAX_SCAN);
    return products
      .filter((p) => p.isActive && p._id !== args.excludeId)
      .slice(0, 4);
  },
});

export const categories = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("categories").take(100);
    return rows
      .filter((row) => row.isActive)
      .sort((a, b) => a.order - b.order);
  },
});

export const categoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const suggestions = query({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    const term = args.term.trim().toLowerCase();
    if (term.length < 2) return [];
    const products = await ctx.db
      .query("products")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .take(MAX_SCAN);
    return products
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 6)
      .map((p) => ({
        id: p._id,
        name: p.name,
        slug: p.slug,
        image: p.images[0] ?? "",
        price: effectivePrice(p),
      }));
  },
});

/** Wishlist / cart line helpers need a cheap product lookup by id. */
export const byId = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ---------------------------------------------------------------------------
// Staff only
// ---------------------------------------------------------------------------

export const staffList = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const products = await ctx.db.query("products").take(MAX_SCAN);
    const sorted = products.sort((a, b) => b.createdAt - a.createdAt);
    if (!args.search || args.search.trim().length === 0) return sorted;
    const term = args.search.trim().toLowerCase();
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.categorySlug.toLowerCase().includes(term) ||
        (p.sku ?? "").toLowerCase().includes(term),
    );
  },
});

export const create = mutation({
  args: productInputValidator,
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    if (args.name.trim().length < 3) throw new Error("Product name is too short.");
    if (args.price <= 0) throw new Error("Price must be greater than zero.");
    if (args.images.length === 0) throw new Error("Add at least one image.");

    const baseSlug = slugify(args.name);
    const existing = await ctx.db
      .query("products")
      .withIndex("slug", (q) => q.eq("slug", baseSlug))
      .first();
    const slug = existing ? `${baseSlug}-${Date.now().toString(36).slice(-4)}` : baseSlug;

    const id = await ctx.db.insert("products", {
      name: cleanText(args.name, 140),
      nameBn: args.nameBn ? cleanText(args.nameBn, 140) : undefined,
      slug,
      description: args.description.slice(0, 4000),
      descriptionBn: args.descriptionBn?.slice(0, 4000),
      categorySlug: cleanText(args.categorySlug, 60),
      price: Math.round(args.price),
      compareAtPrice: args.compareAtPrice ? Math.round(args.compareAtPrice) : undefined,
      images: args.images.filter((url) => url.trim().length > 0),
      sizes: args.sizes,
      colors: args.colors,
      tags: args.tags.map((tag) => tag.toLowerCase().slice(0, 24)),
      stock: Math.max(0, Math.round(args.stock)),
      sku: args.sku ? cleanText(args.sku, 40) : undefined,
      rating: 0,
      reviewCount: 0,
      soldCount: 0,
      isActive: args.isActive,
      isFeatured: args.isFeatured,
      flashSalePrice: args.flashSalePrice ? Math.round(args.flashSalePrice) : undefined,
      flashSaleEndsAt: args.flashSaleEndsAt,
      resellerCommission: args.resellerCommission,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      type: "stock",
      title: "Product added",
      message: `${staff.name ?? "Staff"} created “${cleanText(args.name, 140)}”.`,
      isRead: false,
      createdAt: Date.now(),
    });

    return id;
  },
});

export const update = mutation({
  args: { id: v.id("products"), ...productInputValidator },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found.");
    if (args.price <= 0) throw new Error("Price must be greater than zero.");

    await ctx.db.patch(args.id, {
      name: cleanText(args.name, 140),
      nameBn: args.nameBn ? cleanText(args.nameBn, 140) : undefined,
      description: args.description.slice(0, 4000),
      descriptionBn: args.descriptionBn?.slice(0, 4000),
      categorySlug: cleanText(args.categorySlug, 60),
      price: Math.round(args.price),
      compareAtPrice: args.compareAtPrice ? Math.round(args.compareAtPrice) : undefined,
      images: args.images.filter((url) => url.trim().length > 0),
      sizes: args.sizes,
      colors: args.colors,
      tags: args.tags.map((tag) => tag.toLowerCase().slice(0, 24)),
      stock: Math.max(0, Math.round(args.stock)),
      sku: args.sku ? cleanText(args.sku, 40) : undefined,
      isActive: args.isActive,
      isFeatured: args.isFeatured,
      flashSalePrice: args.flashSalePrice ? Math.round(args.flashSalePrice) : undefined,
      flashSaleEndsAt: args.flashSaleEndsAt,
      resellerCommission: args.resellerCommission,
    });
  },
});

export const toggleActive = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found.");
    await ctx.db.patch(args.id, { isActive: !product.isActive });
  },
});

export const setStock = mutation({
  args: { id: v.id("products"), stock: v.number() },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    if (args.stock < 0) throw new Error("Stock cannot be negative.");
    await ctx.db.patch(args.id, { stock: Math.round(args.stock) });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const product = await ctx.db.get(args.id);
    if (!product) throw new Error("Product not found.");

    const cartRows = await ctx.db
      .query("cartItems")
      .withIndex("productId", (q) => q.eq("productId", args.id))
      .take(500);
    for (const row of cartRows) await ctx.db.delete(row._id);

    const wishRows = await ctx.db
      .query("wishlistItems")
      .withIndex("productId", (q) => q.eq("productId", args.id))
      .take(500);
    for (const row of wishRows) await ctx.db.delete(row._id);

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("productId", (q) => q.eq("productId", args.id))
      .take(500);
    for (const review of reviews) await ctx.db.delete(review._id);

    await ctx.db.delete(args.id);
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    nameBn: v.optional(v.string()),
    tagline: v.optional(v.string()),
    image: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const name = cleanText(args.name, 60);
    if (name.length < 2) throw new Error("Category name is too short.");
    const slug = slugify(name);
    const existing = await ctx.db
      .query("categories")
      .withIndex("slug", (q) => q.eq("slug", slug))
      .first();
    if (existing) throw new Error("That category already exists.");

    const count = (await ctx.db.query("categories").take(100)).length;
    return await ctx.db.insert("categories", {
      name,
      nameBn: args.nameBn ? cleanText(args.nameBn, 60) : undefined,
      slug,
      tagline: args.tagline ? cleanText(args.tagline, 120) : undefined,
      image: args.image,
      order: args.order ?? count,
      isActive: true,
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    nameBn: v.optional(v.string()),
    tagline: v.optional(v.string()),
    image: v.optional(v.string()),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.patch(args.id, {
      name: cleanText(args.name, 60),
      nameBn: args.nameBn ? cleanText(args.nameBn, 60) : undefined,
      tagline: args.tagline ? cleanText(args.tagline, 120) : undefined,
      image: args.image,
      order: args.order,
      isActive: args.isActive,
    });
  },
});

export const removeCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const category = await ctx.db.get(args.id);
    if (!category) throw new Error("Category not found.");
    const linked = await ctx.db
      .query("products")
      .withIndex("categorySlug", (q) => q.eq("categorySlug", category.slug))
      .take(1);
    if (linked.length > 0) {
      throw new Error("Move or delete the products in this category first.");
    }
    await ctx.db.delete(args.id);
  },
});
