import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { effectivePrice } from "./catalog";
import { resolveCoupon } from "./coupons";
import { cleanText, getViewer, isStaff, requireStaff, requireUser } from "./lib/access";
import { deliveryChargeFor, divisionNames } from "./lib/delivery";
import { orderStatusValidator } from "./schema";

const MAX_ORDER_LINES = 40;

/**
 * Issue 10: store-wide default reseller commission (৳ per unit) from admin
 * settings, used when a product does not define its own rate.
 */
async function readDefaultCommission(ctx: QueryCtx) {
  try {
    const row = await ctx.db
      .query("settings")
      .withIndex("key", (q) => q.eq("key", "commissionDefault"))
      .first();
    const rate = Number(row?.value);
    return Number.isFinite(rate) && rate >= 0 ? rate : 0;
  } catch {
    return 0;
  }
}

function buildOrderNumber(): string {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `NF-${stamp}-${rand}`;
}

/**
 * Cash on delivery checkout. Totals, delivery charges, stock and coupons are all
 * recomputed on the server so the client can never influence the price paid.
 */
export const placeOrder = mutation({
  args: {
    customerName: v.string(),
    phone: v.string(),
    division: v.string(),
    district: v.string(),
    address: v.string(),
    note: v.optional(v.string()),
    couponCode: v.optional(v.string()),
    resellerCode: v.optional(v.string()),
    paymentMethod: v.union(v.literal("cod"), v.literal("bkash"), v.literal("nagad"), v.literal("online")),
    paymentReference: v.optional(v.string()),
    acceptedTerms: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    // Issue 8: the customer must accept the store terms before checkout.
    if (args.acceptedTerms !== true) {
      throw new Error("Please accept the terms & conditions to place your order.");
    }

    // Issue 9: reject single-word or gibberish names before an order is created.
    const name = cleanText(args.customerName, 80);
    if (name.length < 2) throw new Error("Please enter your full name.");
    if (!name.includes(" ")) {
      throw new Error("Please enter your full name (first and last name).");
    }
    // Normalise +8801XXXXXXXXX / 8801XXXXXXXXX / 01XXXXXXXXX to a bare 11 digit number.
    const digits = args.phone.replace(/\D/g, "");
    const phone = digits.startsWith("88") && digits.length === 13 ? digits.slice(2) : digits;
    if (!/^01[3-9]\d{8}$/.test(phone)) {
      throw new Error("Enter an 11 digit mobile number starting with 01, e.g. 01712345678.");
    }
    if (!divisionNames().includes(args.division)) {
      throw new Error("Please choose a valid delivery division.");
    }
    const district = cleanText(args.district, 60);
    if (district.length < 2) throw new Error("Please enter your district or city.");
    const address = cleanText(args.address, 240);
    if (address.length < 8) {
      throw new Error("Please enter the full delivery address: house, road and area.");
    }

    const cartRows = await ctx.db
      .query("cartItems")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(200);
    if (cartRows.length === 0) throw new Error("Your bag is empty.");
    if (cartRows.length > MAX_ORDER_LINES) {
      throw new Error("This bag is too large for a single order.");
    }

    const items: Doc<"orders">["items"] = [];
    let subtotal = 0;

    for (const row of cartRows) {
      const product = await ctx.db.get(row.productId);
      if (!product || !product.isActive) {
        throw new Error("A piece in your bag is no longer available.");
      }
      if (product.stock < row.quantity) {
        throw new Error(
          `Only ${product.stock} left of “${product.name}”. Please update your bag.`,
        );
      }
      const price = effectivePrice(product);
      subtotal += price * row.quantity;
      items.push({
        productId: product._id,
        name: product.name,
        image: product.images[0] ?? "",
        price,
        quantity: row.quantity,
        size: row.size,
        color: row.color,
      });
    }

    // Issue 10: payment reference (bKash/Nagad trxID or sender number) is
    // validated and stored server-side, never trusted from the client.
    let paymentReference: string | undefined;
    if (args.paymentMethod === "bkash" || args.paymentMethod === "nagad") {
      const reference = cleanText(args.paymentReference ?? "", 60);
      const looksLikeTxn = /^[A-Za-z0-9]{6,20}$/.test(reference);
      const looksLikePhone = /^01[3-9]\d{8}$/.test(reference.replace(/\D/g, ""));
      if (!looksLikeTxn && !looksLikePhone) {
        throw new Error(
          `Enter the ${args.paymentMethod === "bkash" ? "bKash" : "Nagad"} transaction ID or the mobile number you paid from.`,
        );
      }
      paymentReference = reference;
    }

    const deliveryCharge = deliveryChargeFor(args.division, subtotal);
    const applied = args.couponCode
      ? await resolveCoupon(ctx, args.couponCode, subtotal)
      : null;
    const discount = applied?.discount ?? 0;
    const total = Math.max(0, subtotal + deliveryCharge - discount);

    // Issue 10: read the store-wide default commission BEFORE use so an
    // invalid reseller code never pays commission, and never trusts the client.
    const defaultCommission = await readDefaultCommission(ctx);

    // Reseller commission is computed from live product data, never from the client.
    let resellerId: Doc<"orders">["resellerId"];
    let commission: number | undefined;
    const resellerCode = args.resellerCode
      ? cleanText(args.resellerCode, 24).toUpperCase()
      : "";

    if (resellerCode) {
      const reseller = (await ctx.db.query("users").take(500)).find(
        (candidate) => (candidate.referralCode ?? "").toUpperCase() === resellerCode,
      );
      if (reseller) {
        resellerId = reseller._id;
        let earned = 0;
        for (const item of items) {
          const product = await ctx.db.get(item.productId);
          // Issue 10: commission follows each product's own rate; when unset,
          // fall back to the store-wide default from admin settings.
          earned +=
            (product?.resellerCommission ?? defaultCommission) * item.quantity;
        }
        commission = Math.round(earned);
      }
    }

    const orderNumber = buildOrderNumber();
    const createdAt = Date.now();

    const orderId = await ctx.db.insert("orders", {
      orderNumber,
      userId: user._id,
      customerName: name,
      customerEmail: user.email,
      phone,
      division: args.division,
      district,
      address,
      note: args.note ? cleanText(args.note, 240) : undefined,
      items,
      subtotal,
      deliveryCharge,
      discount,
      total,
      couponCode: applied?.code,
      resellerCode: resellerCode || undefined,
      resellerId,
      commission,
      paymentMethod: args.paymentMethod,
      paymentReference,
      acceptedTerms: true,
      paymentStatus: "unpaid",
      status: "pending",
      statusHistory: [{ status: "pending", at: createdAt, note: "Order placed" }],
      currency: "BDT",
      createdAt,
    });

    // Deduct inventory + bump sold counters.
    for (const item of items) {
      const product = await ctx.db.get(item.productId);
      if (!product) continue;
      await ctx.db.patch(item.productId, {
        stock: Math.max(0, product.stock - item.quantity),
        soldCount: product.soldCount + item.quantity,
      });
    }

    if (applied) {
      const coupon = await ctx.db
        .query("coupons")
        .withIndex("code", (q) => q.eq("code", applied.code))
        .first();
      if (coupon) await ctx.db.patch(coupon._id, { usedCount: coupon.usedCount + 1 });
    }

    for (const row of cartRows) await ctx.db.delete(row._id);

    await ctx.db.patch(user._id, {
      name,
      phone,
      division: args.division,
      district,
      address,
    });

    await ctx.db.insert("notifications", {
      type: "order",
      title: `New order ${orderNumber}`,
      message: `${name} · ${items.length} item${items.length > 1 ? "s" : ""} · ৳${total.toLocaleString()} COD to ${args.division}.`,
      orderId,
      isRead: false,
      createdAt,
    });

    return { orderId, orderNumber, total, deliveryCharge, discount, subtotal };
  },
});

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("orders")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .take(100);
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const byNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    const order = await ctx.db
      .query("orders")
      .withIndex("orderNumber", (q) => q.eq("orderNumber", args.orderNumber.trim().toUpperCase()))
      .first();
    if (!order) return null;
    if (order.userId !== user._id && !isStaff(user)) return null;
    return order;
  },
});

export const staffList = query({
  args: {
    status: v.optional(orderStatusValidator),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireStaff(ctx);
    const rows = args.status
      ? await ctx.db
          .query("orders")
          .withIndex("status", (q) => q.eq("status", args.status!))
          .take(300)
      : await ctx.db.query("orders").take(300);

    const sorted = rows.sort((a, b) => b.createdAt - a.createdAt);
    if (!args.search || args.search.trim().length === 0) return sorted;
    const term = args.search.trim().toLowerCase();
    return sorted.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.phone.includes(term),
    );
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: orderStatusValidator,
    note: v.optional(v.string()),
    paymentStatus: v.optional(v.union(v.literal("unpaid"), v.literal("paid"))),
  },
  handler: async (ctx, args) => {
    const staff = await requireStaff(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found.");
    if (order.status === args.status && !args.paymentStatus) return;

    const event = {
      status: args.status,
      at: Date.now(),
      note: args.note ? cleanText(args.note, 160) : undefined,
    };

    // Cancelling restores inventory.
    if (args.status === "cancelled" && order.status !== "cancelled") {
      for (const item of order.items) {
        const product = await ctx.db.get(item.productId);
        if (!product) continue;
        await ctx.db.patch(item.productId, {
          stock: product.stock + item.quantity,
          soldCount: Math.max(0, product.soldCount - item.quantity),
        });
      }
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
      statusHistory: [...order.statusHistory, event],
      paymentStatus:
        args.paymentStatus ??
        (args.status === "delivered" && order.paymentMethod === "cod"
          ? "paid"
          : order.paymentStatus),
    });

    await ctx.db.insert("notifications", {
      type: "order",
      title: `${order.orderNumber} → ${args.status}`,
      message: `${staff.name ?? "Staff"} updated the order status to ${args.status}.`,
      orderId: args.orderId,
      isRead: false,
      createdAt: Date.now(),
    });
  },
});
