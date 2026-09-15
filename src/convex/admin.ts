import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getViewer, requireAdmin, requireStaff, requireUser, roleOf } from "./lib/access";
import { roleValidator } from "./schema";

const DAY = 24 * 60 * 60 * 1000;

function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Sales, revenue, inventory and customer analytics for the admin dashboard. */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireStaff(ctx);

    const products = await ctx.db.query("products").take(300);
    const orders = await ctx.db.query("orders").take(300);
    const users = await ctx.db.query("users").take(500);
    const reviews = await ctx.db.query("reviews").take(300);

    const liveOrders = orders.filter((order) => order.status !== "cancelled");
    const revenue = liveOrders.reduce((sum, order) => sum + order.total, 0);
    const unitsSold = liveOrders.reduce(
      (sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0),
      0,
    );

    const now = Date.now();
    const salesByDay: { day: string; label: string; revenue: number; orders: number }[] = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const bucket = now - offset * DAY;
      const key = dayKey(bucket);
      const inBucket = liveOrders.filter((order) => dayKey(order.createdAt) === key);
      salesByDay.push({
        day: key,
        label: new Date(bucket).toLocaleDateString("en-GB", {
          weekday: "short",
        }),
        revenue: inBucket.reduce((sum, order) => sum + order.total, 0),
        orders: inBucket.length,
      });
    }

    const productTotals = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of liveOrders) {
      for (const item of order.items) {
        const current = productTotals.get(item.productId) ?? {
          name: item.name,
          units: 0,
          revenue: 0,
        };
        current.units += item.quantity;
        current.revenue += item.price * item.quantity;
        productTotals.set(item.productId, current);
      }
    }
    const topProducts = [...productTotals.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const statusBreakdown = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ].map((status) => ({
      status,
      count: orders.filter((order) => order.status === status).length,
    }));

    return {
      revenue,
      aov: liveOrders.length > 0 ? Math.round(revenue / liveOrders.length) : 0,
      unitsSold,
      orderCount: orders.length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
      deliveredOrders: orders.filter((order) => order.status === "delivered").length,
      cancelledOrders: orders.filter((order) => order.status === "cancelled").length,
      codOutstanding: liveOrders.filter((order) => order.paymentStatus === "unpaid").length,
      productCount: products.length,
      activeProducts: products.filter((product) => product.isActive).length,
      outOfStock: products.filter((product) => product.stock === 0).length,
      customerCount: users.filter((user) => roleOf(user) === "customer").length,
      resellerCount: users.filter((user) => roleOf(user) === "reseller").length,
      reviewCount: reviews.length,
      averageRating:
        reviews.length > 0
          ? Math.round(
              (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
            ) / 10
          : 0,
      salesByDay,
      statusBreakdown,
      topProducts,
      lowStock: products
        .filter((product) => product.stock <= 3)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5)
        .map((product) => ({
          _id: product._id,
          name: product.name,
          stock: product.stock,
          image: product.images[0] ?? "",
        })),
      recentOrders: orders
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6)
        .map((order) => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          total: order.total,
          status: order.status,
          division: order.division,
          createdAt: order.createdAt,
        })),
    };
  },
});

export const listUsers = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").take(500);
    const rows = users
      .filter((user) => !user.isAnonymous)
      .sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0))
      .map((user) => ({
        _id: user._id,
        name: user.name ?? "Unnamed",
        email: user.email ?? "—",
        phone: user.phone ?? "",
        division: user.division ?? "",
        role: roleOf(user),
        blocked: user.blocked ?? false,
        referralCode: user.referralCode ?? "",
        createdAt: user._creationTime,
      }));

    if (!args.search || args.search.trim().length === 0) return rows;
    const term = args.search.trim().toLowerCase();
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term) ||
        row.phone.includes(term),
    );
  },
});

export const setRole = mutation({
  args: { userId: v.id("users"), role: roleValidator },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const target = await ctx.db.get(args.userId);
    if (!target) throw new Error("User not found.");
    if (target._id === admin._id && args.role !== "admin") {
      throw new Error("You cannot remove your own administrator access.");
    }

    const admins = (await ctx.db.query("users").take(500)).filter(
      (user) => user.role === "admin",
    );
    if (target.role === "admin" && args.role !== "admin" && admins.length <= 1) {
      throw new Error("The store must keep at least one administrator.");
    }

    if (args.role === "reseller") {
      const base = (target.name ?? "NABILA")
        .replace(/[^a-zA-Z]/g, "")
        .slice(0, 4)
        .toUpperCase();
      const referralCode =
        target.referralCode ??
        `${base || "NABI"}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      await ctx.db.patch(args.userId, { role: args.role, referralCode });
      return;
    }

    await ctx.db.patch(args.userId, {
      role: args.role,
      referralCode: target.referralCode,
    });
  },
});

export const setBlocked = mutation({
  args: { userId: v.id("users"), blocked: v.boolean() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (args.userId === admin._id) throw new Error("You cannot suspend your own account.");
    await ctx.db.patch(args.userId, { blocked: args.blocked });
  },
});

/**
 * Bootstrap: while the store has no administrator, the first real (non-guest)
 * signed in account can claim the admin role. Once an admin exists this is a no-op,
 * so the admin panel is never publicly claimable.
 */
export const claimAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.isAnonymous) {
      throw new Error("Sign in with an email address to claim administrator access.");
    }
    const admins = (await ctx.db.query("users").take(500)).filter(
      (candidate) => candidate.role === "admin",
    );
    if (admins.length > 0) {
      return { granted: false, role: roleOf(user) };
    }
    await ctx.db.patch(user._id, { role: "admin" });
    await ctx.db.insert("notifications", {
      type: "message",
      title: "Store administrator created",
      message: `${user.name ?? user.email ?? "The owner"} became the first administrator of NABILA FASHION.`,
      isRead: false,
      createdAt: Date.now(),
    });
    return { granted: true, role: "admin" as const };
  },
});

/** Reseller commission summary. */
export const resellerSummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    const orders = await ctx.db.query("orders").take(300);
    const referred = orders.filter(
      (order) => order.resellerId !== undefined && order.resellerId === user._id,
    );
    return {
      referralCode: user.referralCode ?? "",
      orders: referred.length,
      commission: referred.reduce((sum, order) => sum + (order.commission ?? 0), 0),
      revenue: referred.reduce((sum, order) => sum + order.total, 0),
      recent: referred
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map((order) => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          commission: order.commission ?? 0,
          status: order.status,
          createdAt: order.createdAt,
        })),
    };
  },
});
