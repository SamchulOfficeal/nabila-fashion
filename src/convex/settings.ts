import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/access";
import { DEFAULT_USD_RATE, FREE_DELIVERY_THRESHOLD } from "./lib/delivery";

export const DEFAULTS = {
  storeName: "NABILA FASHION",
  logoUrl: "/logo.svg",
  usdRate: String(DEFAULT_USD_RATE),
  freeDeliveryThreshold: String(FREE_DELIVERY_THRESHOLD),
  supportPhone: "+8801700000000",
  whatsappNumber: "8801700000000",
  announcement:
    "Free delivery on orders over ৳4,000 · Cash on delivery available across Bangladesh",
  webhookEnabled: "false",
  // Issue 10: the eleven settings the admin panel writes but DEFAULTS was
  // missing — without these, `raw` and `publicConfig` silently dropped them.
  chatEnabled: "true",
  chatGreeting: "Hello! How can we help you today?",
  chatApiKey: "",
  chatSystemPrompt: "You are a helpful customer care assistant for NABILA FASHION.",
  paymentBkashEnabled: "false",
  paymentBkashNumber: "",
  paymentNagadEnabled: "false",
  paymentNagadNumber: "",
  courierPathaoPhone: "",
  courierSteadfastPhone: "",
};

export const publicConfig = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("settings").take(50);
    const map = new Map(rows.map((row) => [row.key, row.value]));
    const read = (key: keyof typeof DEFAULTS) => map.get(key) ?? DEFAULTS[key];
    return {
      storeName: read("storeName"),
      logoUrl: read("logoUrl"),
      usdRate: Number(read("usdRate")) || DEFAULT_USD_RATE,
      freeDeliveryThreshold: Number(read("freeDeliveryThreshold")) || FREE_DELIVERY_THRESHOLD,
      supportPhone: read("supportPhone"),
      whatsappNumber: read("whatsappNumber"),
      announcement: read("announcement"),
      chatEnabled: read("chatEnabled") !== "false",
      chatGreeting: read("chatGreeting"),
      paymentBkashEnabled: read("paymentBkashEnabled") === "true",
      paymentBkashNumber: read("paymentBkashNumber"),
      paymentNagadEnabled: read("paymentNagadEnabled") === "true",
      paymentNagadNumber: read("paymentNagadNumber"),
    };
  },
});

export const raw = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("settings").take(50);
    const map = new Map(rows.map((row) => [row.key, row.value]));
    return Object.fromEntries(
      Object.entries(DEFAULTS).map(([key, fallback]) => [key, map.get(key) ?? fallback]),
    ) as Record<keyof typeof DEFAULTS, string>;
  },
});

export const update = mutation({
  args: {
    values: v.array(v.object({ key: v.string(), value: v.string() })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    for (const entry of args.values) {
      const key = entry.key.trim().slice(0, 40);
      const value = entry.value.trim().slice(0, 300);
      if (!key) continue;
      const existing = await ctx.db
        .query("settings")
        .withIndex("key", (q) => q.eq("key", key))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { value });
      } else {
        await ctx.db.insert("settings", { key, value });
      }
    }
  },
});
