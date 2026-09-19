import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanText, requireStaff } from "./lib/access";

const FREQUENCIES = ["once", "daily", "always"] as const;
type Frequency = (typeof FREQUENCIES)[number];

const asFrequency = (value: string): Frequency =>
  (FREQUENCIES as readonly string[]).includes(value) ? (value as Frequency) : "once";

/** Public: the popup a storefront visitor should currently see, or null. */
export const active = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("popups")
      .withIndex("isActive", (q) => q.eq("isActive", true))
      .take(20);
    const now = Date.now();
    return (
      rows
        .filter((row) => row.startAt <= now && (!row.endAt || row.endAt > now))
        .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
    );
  },
});

export const staffList = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("popups").take(50);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("popups")),
    title: v.string(),
    description: v.optional(v.string()),
    image: v.string(),
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    frequency: v.union(
      v.literal("once"),
      v.literal("daily"),
      v.literal("always"),
    ),
    startAt: v.number(),
    endAt: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const title = cleanText(args.title, 120);
    if (title.length < 3) throw new Error("Popup title is too short.");
    if (args.image.trim().length === 0) throw new Error("Popup image is required.");

    const frequency = asFrequency(args.frequency);
    const startAt = Math.round(args.startAt);
    const endAt = args.endAt ? Math.round(args.endAt) : undefined;
    if (!Number.isFinite(startAt)) throw new Error("Enter a valid start date.");
    if (endAt !== undefined && (!Number.isFinite(endAt) || endAt <= startAt)) {
      throw new Error("The end date must be after the start date.");
    }

    const patch = {
      title,
      description: args.description ? cleanText(args.description, 240) : undefined,
      image: args.image.trim(),
      ctaText: args.ctaText ? cleanText(args.ctaText, 40) : undefined,
      ctaUrl: args.ctaUrl ? args.ctaUrl.trim().slice(0, 200) : undefined,
      frequency,
      startAt,
      endAt,
      isActive: args.isActive,
      updatedAt: Date.now(),
    };

    if (args.id) {
      await ctx.db.patch(args.id, patch);
      return args.id;
    }
    return await ctx.db.insert("popups", { ...patch, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("popups") },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    await ctx.db.delete(args.id);
    return true;
  },
});
