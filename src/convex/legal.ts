import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";

/** Slugs of the legal documents the storefront links to. */
export const LEGAL_SLUGS = ["privacy-policy", "terms-conditions", "refund-policy"] as const;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("legalPages").take(20);
    return rows.sort((a, b) => a.slug.localeCompare(b.slug));
  },
});

export const get = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("legalPages")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const upsert = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const slug = args.slug.trim().toLowerCase();
    if (!slug) throw new Error("A page slug is required.");
    const title = args.title.trim().slice(0, 120);
    if (title.length < 3) throw new Error("Please give this page a title.");
    const content = args.content.trim().slice(0, 20000);

    const existing = await ctx.db
      .query("legalPages")
      .withIndex("slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { title, content, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("legalPages", {
      slug,
      title,
      content,
      updatedAt: Date.now(),
    });
  },
});
