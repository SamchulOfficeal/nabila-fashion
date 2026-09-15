import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireStaff } from "./lib/access";

export const staffRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = await ctx.db.query("notifications").take(200);
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, args.limit ?? 20);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("notifications")
      .withIndex("isRead", (q) => q.eq("isRead", false))
      .take(200);
    return rows.length;
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("isRead", (q) => q.eq("isRead", false))
      .take(200);
    for (const row of rows) await ctx.db.patch(row._id, { isRead: true });
  },
});
