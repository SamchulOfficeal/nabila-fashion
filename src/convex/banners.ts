import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanText, requireStaff } from "./lib/access";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("banners")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .take(20);
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const staffList = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("banners").take(50);
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("banners")),
    title: v.string(),
    subtitle: v.optional(v.string()),
    eyebrow: v.optional(v.string()),
    image: v.string(),
    ctaLabel: v.optional(v.string()),
    ctaHref: v.optional(v.string()),
    order: v.number(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const title = cleanText(args.title, 120);
    if (title.length < 3) throw new Error("Banner title is too short.");
    if (args.image.trim().length === 0) throw new Error("Banner image is required.");

    const patch = {
      title,
      subtitle: args.subtitle ? cleanText(args.subtitle, 180) : undefined,
      eyebrow: args.eyebrow ? cleanText(args.eyebrow, 40) : undefined,
      image: args.image.trim(),
      ctaLabel: args.ctaLabel ? cleanText(args.ctaLabel, 40) : undefined,
      ctaHref: args.ctaHref ? args.ctaHref.trim().slice(0, 200) : undefined,
      order: Math.round(args.order),
      isActive: args.isActive,
    };

    if (args.id) {
      await ctx.db.patch(args.id, patch);
      return args.id;
    }
    return await ctx.db.insert("banners", patch);
  },
});

export const remove = mutation({
  args: { id: v.id("banners") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.delete(args.id);
  },
});
