/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  onSnapshot,
  orderBy,
  type DocumentData,
} from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "@/lib/firebase";
import { deliveryChargeFor, divisionNames } from "@/convex/lib/delivery";

export type FirebaseApiPath = string;
type AnyRecord = Record<string, any>;

const now = () => Date.now();

/**
 * Performance: short in-memory cache for hot public reads (config, products,
 * categories…). Firestore charges per document read and every page load hits
 * the same few paths, so a 15 s micro-cache cuts most of that traffic and
 * makes page-to-page navigation feel instant.
 */
const QUERY_CACHE = new Map<string, { at: number; value: AnyRecord[] }>();
const QUERY_CACHE_TTL = 15_000;

function cached(name: string, key: string, fetcher: () => Promise<AnyRecord[]>): Promise<AnyRecord[]> {
  const cacheKey = `${name}:${key}`;
  const hit = QUERY_CACHE.get(cacheKey);
  if (hit && now() - hit.at < QUERY_CACHE_TTL) return Promise.resolve(hit.value);
  return fetcher().then((value) => {
    QUERY_CACHE.set(cacheKey, { at: now(), value });
    // Keep the cache bounded.
    if (QUERY_CACHE.size > 64) {
      const oldest = [...QUERY_CACHE.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) QUERY_CACHE.delete(oldest[0]);
    }
    return value;
  });
}

/** Invalidates the micro-cache after every mutation (keeps data fresh). */
function invalidateCache(prefix?: string) {
  if (!prefix) QUERY_CACHE.clear();
  else for (const key of QUERY_CACHE.keys()) if (key.startsWith(prefix)) QUERY_CACHE.delete(key);
}
const table = (name: string) => collection(db, name);
const document = (name: string, id: string) => doc(db, name, id);
const clean = (value: unknown, max = 4000) => String(value ?? "").trim().slice(0, max);
const withId = <T extends DocumentData>(snapshot: { id: string; data: () => T }) => ({
  ...snapshot.data(),
  _id: snapshot.id,
  _creationTime: snapshot.data().createdAt ?? snapshot.data()._creationTime ?? now(),
});
const all = (name: string) =>
  cached(name, "all", async () => (await getDocs(table(name))).docs.map(withId));

/**
 * Phase 2 (Tier 1): real-time notifications subscription.
 *  role "staff"    → every staff notification (rows with no userId target)
 *  role "customer" → only notifications addressed to the signed-in user
 * Returns an unsubscribe function. Emits an empty list when signed out.
 */
export function subscribeNotifications(
  role: "staff" | "customer",
  callback: (rows: AnyRecord[]) => void,
  onError?: (error: unknown) => void,
) {
  const user = auth.currentUser;
  if (!user) {
    callback([]);
    return () => undefined;
  }
  // Security: scope the QUERY server-side. Staff rows (no userId) are never
  // even downloaded for customers, and customer rows never reach staff —
  // previously every client downloaded all 50 rows and filtered in the UI.
  const rowsQuery =
    role === "customer"
      ? query(
          table("notifications"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(50),
        )
      : query(table("notifications"), orderBy("createdAt", "desc"), limit(50));
  return onSnapshot(
    rowsQuery,
    (snapshot) => {
      const rows = snapshot.docs
        .map(withId)
        .filter((row) => (role === "staff" ? !row.userId : true));
      callback(rows);
    },
    (error) => {
      console.warn("[notifications] subscription error", (error as Error)?.message);
      onError?.(error);
    },
  );
}

const DEFAULT_SETTINGS: AnyRecord = {
  storeName: "NABILA FASHION",
  logoUrl: "/auravelle-mark.svg",
  announcement: "Free delivery over ৳4,000",
  supportPhone: "+8801700000000",
  whatsappNumber: "+8801700000000",
  chatEnabled: true,
  chatGreeting: "Hello! How can we help you today?",
  chatApiKey: "",
  chatSystemPrompt: "You are a helpful customer care assistant for NABILA FASHION.",
  freeDeliveryThreshold: 4000,
  usdRate: 120,
  currency: "BDT",
  // Mobile-financial-service rails. Gateways are added when merchant keys exist;
  // COD is always available. Structure ready for bKash/Nagad merchants.
  paymentBkashEnabled: false,
  paymentBkashNumber: "",
  paymentBkashType: "merchant",
  paymentNagadEnabled: false,
  paymentNagadNumber: "",
  // Courier integrations (Pathao/Steadfast). Parcel is dispatched over the
  // phone network today; consignment numbers attach to orders when keys exist.
  courierPathaoEnabled: false,
  courierPathaoPhone: "",
  courierSteadfastEnabled: false,
  courierSteadfastPhone: "",
};

async function ensureProfile(): Promise<AnyRecord | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const profileRef = document("users", user.uid);
  const existing = await getDoc(profileRef);
  if (!existing.exists()) {
    const profile = {
      name: user.displayName ?? "",
      email: user.email ?? "",
      image: user.photoURL ?? "",
      isAnonymous: user.isAnonymous,
      role: "customer",
      blocked: false,
      createdAt: now(),
    };
    await setDoc(profileRef, profile);
    return { _id: user.uid, ...profile };
  }
  return { _id: existing.id, ...existing.data() };
}

async function requireProfile(roles?: string[]) {
  const profile = await ensureProfile();
  if (!profile || profile.isAnonymous) throw new Error("Please sign in to continue.");
  if (profile.blocked) throw new Error("This account has been suspended.");
  if (roles && !roles.includes(profile.role ?? "customer")) {
    throw new Error("You do not have permission to perform this action.");
  }
  return profile;
}

const roleOf = (profile: AnyRecord) => profile.role ?? "customer";

function effectivePrice(product: AnyRecord) {
  return product.flashSalePrice && product.flashSaleEndsAt && product.flashSaleEndsAt > now()
    ? product.flashSalePrice
    : product.price;
}

function orderNumber() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `NF-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function products(args: AnyRecord = {}): Promise<AnyRecord[]> {
  const rows = (await all("products")).filter((item) => args.staff || item.isActive);
  const term = clean(args.search).toLowerCase();
  const result = rows.filter((item) => {
    if (args.category && item.categorySlug !== args.category) return false;
    if (args.featuredOnly && !item.isFeatured) return false;
    if (args.flashSaleOnly && !(item.flashSalePrice && item.flashSaleEndsAt > now())) return false;
    if (args.inStockOnly && item.stock <= 0) return false;
    if (args.minPrice !== undefined && effectivePrice(item) < args.minPrice) return false;
    if (args.maxPrice !== undefined && effectivePrice(item) > args.maxPrice) return false;
    if (args.sizes?.length && !item.sizes?.some((size: string) => args.sizes.includes(size))) return false;
    if (args.colors?.length && !item.colors?.some((color: string) => args.colors.includes(color))) return false;
    if (term) {
      const haystack = [item.name, item.nameBn, item.categorySlug, item.sku, ...(item.tags ?? [])].join(" ").toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
  result.sort((a, b) => {
    if (args.sort === "price-asc") return effectivePrice(a) - effectivePrice(b);
    if (args.sort === "price-desc") return effectivePrice(b) - effectivePrice(a);
    if (args.sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
    if (args.sort === "popular") return (b.soldCount ?? 0) - (a.soldCount ?? 0);
    // Issue 6: newest first. createdAt can be undefined on legacy docs, so
    // fall back to Firestore's own _creationTime before defaulting to 0.
    return (b.createdAt ?? b._creationTime ?? 0) - (a.createdAt ?? a._creationTime ?? 0);
  });
  return result.slice(0, args.limit ?? 60);
}

async function popupActive() {
  const rows = (await all("popups"))
    .filter((item) => item.isActive)
    .filter((item) => {
      const startAt = Number(item.startAt) || 0;
      const endAt = item.endAt ? Number(item.endAt) : undefined;
      return startAt <= now() && (endAt === undefined || endAt > now());
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return rows[0] ?? null;
}

async function validateCoupon(rawCode: string, subtotal: number) {
  const code = clean(rawCode, 24).toUpperCase();
  const rows = (await all("coupons")).filter((item) => item.code === code);
  const coupon = rows[0];
  if (!coupon || !coupon.isActive) throw new Error("This coupon code is not valid.");
  if (coupon.expiresAt && coupon.expiresAt < now()) throw new Error("This coupon has expired.");
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) throw new Error("This coupon has already been fully redeemed.");
  if (subtotal < coupon.minSpend) throw new Error(`Add ৳${coupon.minSpend - subtotal} more to use this coupon.`);
  const discount = coupon.type === "percent" ? Math.round(subtotal * coupon.value / 100) : Math.min(coupon.value, subtotal);
  return { code: coupon.code, discount, description: coupon.description };
}

async function placeOrder(args: AnyRecord) {
  const user = await requireProfile();
  if (args.acceptedTerms !== true) throw new Error("Please accept the terms & conditions to place your order.");
  if (!divisionNames().includes(args.division)) throw new Error("Please choose a valid delivery division.");
  const phoneDigits = clean(args.phone).replace(/\D/g, "");
  const phone = phoneDigits.startsWith("88") && phoneDigits.length === 13 ? phoneDigits.slice(2) : phoneDigits;
  if (!/^01[3-9]\d{8}$/.test(phone)) throw new Error("Enter an 11 digit mobile number starting with 01, e.g. 01712345678.");
  const district = clean(args.district, 60).replace(/\s+/g, " ");
  const address = clean(args.address, 240).replace(/\s+/g, " ");
  if (district.length < 3 || !/[A-Za-z\u0980-\u09FF]/.test(district)) throw new Error("Please enter a valid district or city.");
  if (address.length < 10 || !/[A-Za-z\u0980-\u09FF]/.test(address)) throw new Error("Please enter a complete delivery address.");
  const customerName = clean(args.customerName, 80).replace(/\s+/g, " ");
  if (customerName.length < 3 || !customerName.includes(" ")) throw new Error("Please enter your full name (first and last name).");

  const cartSnapshot = (await getDocs(query(table("cartItems"), where("userId", "==", user._id)))).docs.map(withId);
  if (!cartSnapshot.length) throw new Error("Your bag is empty.");
  const productSnapshots = new Map<string, AnyRecord>();
  for (const item of cartSnapshot) {
    const snapshot = await getDoc(document("products", item.productId));
    if (!snapshot.exists()) throw new Error("A piece in your bag is no longer available.");
    productSnapshots.set(item.productId, withId(snapshot));
  }

  const applied = args.couponCode ? await validateCoupon(args.couponCode, cartSnapshot.reduce((sum, item) => sum + effectivePrice(productSnapshots.get(item.productId)!) * item.quantity, 0)) : null;
  // Validate the bKash/Nagad reference server-side instead of trusting the client.
  const paymentReference = args.paymentMethod === "bkash" || args.paymentMethod === "nagad"
    ? (() => { const ref = clean(args.paymentReference, 60); if (!(/^[A-Za-z0-9]{6,20}$/.test(ref) || /^01[3-9]\d{8}$/.test(ref.replace(/\D/g, "")))) throw new Error(`Enter the ${args.paymentMethod === "bkash" ? "bKash" : "Nagad"} transaction ID or the mobile number you paid from.`); return ref; })()
    : "";
  const createdAt = now();
  const result = await runTransaction(db, async (transaction) => {
    let subtotal = 0;
    const items: AnyRecord[] = [];
    const productSnapshotsInTransaction = new Map<string, AnyRecord>();
    for (const item of cartSnapshot) {
      const productRef = document("products", item.productId);
      const productSnapshot = await transaction.get(productRef);
      if (!productSnapshot.exists()) throw new Error("A product in your bag is no longer available.");
      const product = withId(productSnapshot);
      if (!product.isActive || product.stock < item.quantity) throw new Error(`Only ${product.stock ?? 0} left of “${product.name}”. Please update your bag.`);
      const price = effectivePrice(product);
      subtotal += price * item.quantity;
      items.push({ productId: product._id, name: product.name, image: product.images?.[0] ?? "", price, quantity: item.quantity, size: item.size, color: item.color });
      productSnapshotsInTransaction.set(item.productId, product);
    }
    const deliveryCharge = deliveryChargeFor(args.division, subtotal);
    const discount = applied?.discount ?? 0;
    const total = Math.max(0, subtotal + deliveryCharge - discount);
    const orderRef = doc(collection(db, "orders"));
    const order = {
      orderNumber: orderNumber(), userId: user._id, customerName, customerEmail: user.email ?? "", phone,
      division: args.division, district, address, note: args.note ? clean(args.note, 240) : "",
      items, subtotal, deliveryCharge, discount, total, couponCode: applied?.code ?? "", resellerCode: clean(args.resellerCode, 24).toUpperCase(),
      paymentMethod: args.paymentMethod ?? "cod", paymentStatus: "unpaid", status: "pending", statusHistory: [{ status: "pending", at: createdAt, note: "Order placed" }], currency: "BDT", paymentReference, acceptedTerms: true, courierName: "", consignmentCode: "", createdAt,
    };
    transaction.set(orderRef, order);
    for (const item of cartSnapshot) {
      const product = productSnapshotsInTransaction.get(item.productId)!;
      transaction.update(document("products", item.productId), { stock: product.stock - item.quantity, soldCount: (product.soldCount ?? 0) + item.quantity });
    }
    for (const item of cartSnapshot) transaction.delete(document("cartItems", item._id));
    // Security: write ONLY the checkout fields back to the profile — never
    // spread the whole profile object (role/blocked/referralCode must not be
    // rewritten by checkout, and a stale local copy could clobber them).
    transaction.set(document("users", user._id), { name: order.customerName, phone, division: args.division, district: order.district, address: order.address }, { merge: true });
    if (applied) {
      const coupons = await getDocs(query(table("coupons"), where("code", "==", applied.code), limit(1)));
      if (!coupons.empty) transaction.update(coupons.docs[0].ref, { usedCount: (coupons.docs[0].data().usedCount ?? 0) + 1 });
    }
    transaction.set(doc(collection(db, "notifications")), { type: "order", title: `New order ${order.orderNumber}`, message: `${order.customerName} · ৳${total.toLocaleString()} COD`, orderId: orderRef.id, isRead: false, createdAt });
    return { orderId: orderRef.id, orderNumber: order.orderNumber, total, deliveryCharge, discount, subtotal };
  });
  return result;
}

/**
 * Security: lightweight in-memory rate limiter for expensive/abusable
 * mutations. Sliding window per user + action; state lives only in this tab.
 */
const RATE_WINDOW = 60_000;
const rateBuckets = new Map<string, number[]>();
function rateLimit(action: string, maxPerMinute: number) {
  const userId = auth.currentUser?.uid ?? "anon";
  const key = `${action}:${userId}`;
  const stamps = (rateBuckets.get(key) ?? []).filter((at) => now() - at < RATE_WINDOW);
  if (stamps.length >= maxPerMinute) {
    throw new Error("Too many attempts. Please wait a minute and try again.");
  }
  stamps.push(now());
  rateBuckets.set(key, stamps);
}

async function overview() {
  const profile = await requireProfile(["admin", "manager"]);
  const [productsRows, ordersRows, usersRows, reviewsRows] = await Promise.all([all("products"), all("orders"), all("users"), all("reviews")]);
  const live = ordersRows.filter((item) => item.status !== "cancelled");
  const revenue = live.reduce((sum, item) => sum + item.total, 0);
  const salesByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now() - (6 - index) * 86400000);
    const key = date.toISOString().slice(0, 10);
    const rows = live.filter((item) => new Date(item.createdAt).toISOString().slice(0, 10) === key);
    return { day: key, label: date.toLocaleDateString("en-GB", { weekday: "short" }), revenue: rows.reduce((sum, item) => sum + item.total, 0), orders: rows.length };
  });
  const totals = new Map<string, AnyRecord>();
  for (const order of live) for (const item of order.items ?? []) {
    const row = totals.get(item.productId) ?? { name: item.name, units: 0, revenue: 0 };
    row.units += item.quantity; row.revenue += item.price * item.quantity; totals.set(item.productId, row);
  }
  return {
    revenue, aov: live.length ? Math.round(revenue / live.length) : 0,
    unitsSold: live.reduce((sum, item) => sum + (item.items ?? []).reduce((count: number, line: AnyRecord) => count + line.quantity, 0), 0),
    orderCount: ordersRows.length, pendingOrders: ordersRows.filter((item) => item.status === "pending").length, deliveredOrders: ordersRows.filter((item) => item.status === "delivered").length,
    cancelledOrders: ordersRows.filter((item) => item.status === "cancelled").length, codOutstanding: live.filter((item) => item.paymentStatus === "unpaid").length,
    productCount: productsRows.length, activeProducts: productsRows.filter((item) => item.isActive).length, outOfStock: productsRows.filter((item) => item.stock === 0).length,
    customerCount: usersRows.filter((item) => roleOf(item) === "customer").length, resellerCount: usersRows.filter((item) => roleOf(item) === "reseller").length,
    reviewCount: reviewsRows.length, averageRating: reviewsRows.length ? Math.round(reviewsRows.reduce((sum, item) => sum + item.rating, 0) / reviewsRows.length * 10) / 10 : 0,
    salesByDay, statusBreakdown: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"].map((status) => ({ status, count: ordersRows.filter((item) => item.status === status).length })),
    topProducts: [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    lowStock: productsRows.filter((item) => item.stock <= 3).sort((a, b) => a.stock - b.stock).slice(0, 5).map((item) => ({ _id: item._id, name: item.name, stock: item.stock, image: item.images?.[0] ?? "" })),
    recentOrders: [...ordersRows].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map((item) => ({ _id: item._id, orderNumber: item.orderNumber, customerName: item.customerName, total: item.total, status: item.status, division: item.division, createdAt: item.createdAt })),
    actor: profile._id,
  };
}

export async function runQuery(path: FirebaseApiPath, args: AnyRecord = {}) {
  const [module, operation] = path.split(".");
  switch (`${module}.${operation}`) {
    case "settings.publicConfig": { const rows = await all("settings"); const values = { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) }; return { storeName: values.storeName, logoUrl: values.logoUrl, announcement: values.announcement, supportPhone: values.supportPhone, whatsappNumber: values.whatsappNumber, chatEnabled: values.chatEnabled !== false && values.chatEnabled !== "false", chatGreeting: values.chatGreeting, usdRate: Number(values.usdRate) || 120, freeDeliveryThreshold: Number(values.freeDeliveryThreshold) || 4000, paymentBkashEnabled: values.paymentBkashEnabled === true || values.paymentBkashEnabled === "true", paymentBkashNumber: values.paymentBkashNumber ?? "", paymentNagadEnabled: values.paymentNagadEnabled === true || values.paymentNagadEnabled === "true", paymentNagadNumber: values.paymentNagadNumber ?? "" }; }
    case "settings.raw": { const rows = await all("settings"); return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) }; }
    case "catalog.list": return await products(args);
    case "catalog.featured": return await products({ ...args, featuredOnly: true });
    case "catalog.flashSales": return await products({ ...args, flashSaleOnly: true });
    case "catalog.staffList": return await products({ ...args, staff: true });
    case "catalog.bySlug": return (await all("products")).find((item) => item.slug === args.slug) ?? null;
    case "catalog.related": return (await products({ category: args.categorySlug })).filter((item) => item._id !== args.excludeId).slice(0, 4);
    case "catalog.byId": { const snapshot = await getDoc(document("products", args.id)); return snapshot.exists() ? withId(snapshot) : null; }
    case "catalog.categories": return (await all("categories")).filter((item) => item.isActive).sort((a, b) => a.order - b.order);
    case "catalog.categoryBySlug": return (await all("categories")).find((item) => item.slug === args.slug) ?? null;
    case "catalog.suggestions": return (await products({ search: args.term, limit: 6 })).map((item) => ({ id: item._id, name: item.name, slug: item.slug, image: item.images?.[0] ?? "", price: effectivePrice(item) }));
    case "profile.get": return await ensureProfile();
    case "cart.myCart": { const profile = await ensureProfile(); if (!profile) return []; const rows = (await all("cartItems")).filter((item) => item.userId === profile._id); const result: AnyRecord[] = []; for (const row of rows) { const product = (await runQuery("catalog.byId", { id: row.productId })) as AnyRecord; if (product?.isActive) result.push({ _id: row._id, quantity: row.quantity, size: row.size, color: row.color, product }); } return result; }
    case "cart.summary": { const lines = await runQuery("cart.myCart", {}); return { count: lines.reduce((sum: number, row: AnyRecord) => sum + row.quantity, 0), lines: lines.length, subtotal: lines.reduce((sum: number, row: AnyRecord) => sum + effectivePrice(row.product) * row.quantity, 0) }; }
    case "wishlist.ids": { const profile = await ensureProfile(); return profile ? (await all("wishlistItems")).filter((item) => item.userId === profile._id).map((item) => item.productId) : []; }
    case "wishlist.myWishlist": { const profile = await ensureProfile(); if (!profile) return []; const rows = (await all("wishlistItems")).filter((item) => item.userId === profile._id); const result: AnyRecord[] = []; for (const row of rows) { const product = await runQuery("catalog.byId", { id: row.productId }); if (product) result.push({ _id: row._id, product, price: effectivePrice(product as AnyRecord) }); } return result.sort((a: AnyRecord, b: AnyRecord) => a.product.name.localeCompare(b.product.name)); }
    case "orders.myOrders": { const profile = await ensureProfile(); return profile ? (await all("orders")).filter((item) => item.userId === profile._id).sort((a, b) => b.createdAt - a.createdAt) : []; }
    case "orders.staffList": { await requireProfile(["admin", "manager"]); let rows = await all("orders"); if (args.status) rows = rows.filter((item) => item.status === args.status); const term = clean(args.search).toLowerCase(); return rows.filter((item) => !term || `${item.orderNumber} ${item.customerName} ${item.phone}`.toLowerCase().includes(term)).sort((a, b) => b.createdAt - a.createdAt); }
    case "coupons.validate": try { const applied = await validateCoupon(args.code, args.subtotal); return { ok: true, discount: applied.discount, message: "Coupon applied" }; } catch (error) { return { ok: false, discount: 0, message: error instanceof Error ? error.message : "Invalid coupon." }; }
    case "coupons.active": return (await all("coupons")).filter((item) => item.isActive);
    case "coupons.staffList": await requireProfile(["admin", "manager"]); return (await all("coupons")).sort((a, b) => b.createdAt - a.createdAt);
    case "banners.list": return (await all("banners")).filter((item) => item.isActive).sort((a, b) => a.order - b.order);
    case "banners.staffList": await requireProfile(["admin", "manager"]); return (await all("banners")).sort((a, b) => a.order - b.order);
    case "popups.active": return await popupActive();
    case "popups.staffList": { await requireProfile(["admin", "manager"]); return (await all("popups")).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); }
    case "legal.get": return (await all("legalPages")).find((item) => item.slug === args.slug) ?? null;
    case "legal.list": return (await all("legalPages")).sort((a, b) => a.slug.localeCompare(b.slug));
    case "admin.overview": return overview();
    case "admin.listUsers": { await requireProfile(["admin"]); const term = clean(args.search).toLowerCase(); return (await all("users")).filter((item) => !item.isAnonymous && (!term || `${item.name} ${item.email} ${item.phone}`.toLowerCase().includes(term))).map((item) => ({ _id: item._id, name: item.name ?? "Unnamed", email: item.email ?? "—", phone: item.phone ?? "", division: item.division ?? "", role: roleOf(item), blocked: item.blocked ?? false, referralCode: item.referralCode ?? "", createdAt: item.createdAt ?? item._creationTime })); }
    case "admin.resellerSummary": { const profile = await ensureProfile(); if (!profile) return null; const rows = (await all("orders")).filter((item) => item.resellerId === profile._id); return { referralCode: profile.referralCode ?? "", orders: rows.length, commission: rows.reduce((sum, item) => sum + (item.commission ?? 0), 0), revenue: rows.reduce((sum, item) => sum + item.total, 0), recent: rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5) }; }
    case "reseller.myWallet": { const profile = await ensureProfile(); if (!profile) return null; const rows = (await all("orders")).filter((item) => item.resellerId === profile._id); const adjustRows = (await all("walletAdjustments")).filter((item) => item.userId === profile._id); const requestRows = (await all("withdrawals")).filter((item) => item.userId === profile._id); const earned = rows.filter((item) => item.status === "delivered").reduce((sum, item) => sum + (item.commission ?? 0), 0); const pending = rows.filter((item) => ["pending", "confirmed", "processing", "shipped"].includes(item.status)).reduce((sum, item) => sum + (item.commission ?? 0), 0); const adjustTotal = adjustRows.reduce((sum, item) => sum + item.amount, 0); const paidOut = requestRows.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0); const held = requestRows.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0); const liveOrders = rows.filter((item) => item.status !== "cancelled"); return { role: profile.role ?? "customer", referralCode: profile.referralCode ?? "", earned, pending, adjustments: adjustTotal, paidOut, held, balance: earned + adjustTotal - paidOut - held, revenue: liveOrders.reduce((sum, item) => sum + item.total, 0), orderCount: liveOrders.length, recent: [...rows].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map((item) => ({ _id: item._id, orderNumber: item.orderNumber, total: item.total, commission: item.commission ?? 0, status: item.status, createdAt: item.createdAt })), requests: [...requestRows].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10) }; }
    case "reseller.minWithdrawal": { const settingsRows = await all("settings"); const value = Number(settingsRows.find((item) => item.key === "resellerMinWithdrawal")?.value); return Number.isFinite(value) && value >= 0 ? value : 500; }
    case "reseller.adminOverview": { await requireProfile(["admin"]); const users = (await all("users")).filter((item) => roleOf(item) === "reseller"); const orders = await all("orders"); const adjustAll = await all("walletAdjustments"); const withdrawAll = await all("withdrawals"); const walletFor = (userId: string) => { const myOrders = orders.filter((item) => item.resellerId === userId); const earned = myOrders.filter((item) => item.status === "delivered").reduce((sum, item) => sum + (item.commission ?? 0), 0); const pending = myOrders.filter((item) => ["pending", "confirmed", "processing", "shipped"].includes(item.status)).reduce((sum, item) => sum + (item.commission ?? 0), 0); const adjustTotal = adjustAll.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.amount, 0); const myRequests = withdrawAll.filter((item) => item.userId === userId); const paidOut = myRequests.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0); const held = myRequests.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0); return { earned, pending, adjustments: adjustTotal, paidOut, held, balance: earned + adjustTotal - paidOut - held }; }; const resellers = users.map((user) => ({ _id: user._id, name: user.name ?? "Unnamed", email: user.email ?? "", phone: user.phone ?? "", referralCode: user.referralCode ?? "", blocked: user.blocked ?? false, createdAt: user.createdAt ?? user._creationTime, orderCount: orders.filter((item) => item.resellerId === user._id && item.status !== "cancelled").length, revenue: orders.filter((item) => item.resellerId === user._id && item.status !== "cancelled").reduce((sum, item) => sum + item.total, 0), ...walletFor(user._id) })).sort((a, b) => b.earned - a.earned); const pendingRequests = withdrawAll.filter((item) => item.status === "pending" || item.status === "approved").sort((a, b) => b.createdAt - a.createdAt).map((item) => ({ ...item, name: users.find((user) => user._id === item.userId)?.name ?? "Reseller", referralCode: users.find((user) => user._id === item.userId)?.referralCode ?? "" })); const ledger = [...withdrawAll].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30).map((item) => ({ _id: item._id, name: users.find((user) => user._id === item.userId)?.name ?? "Reseller", amount: item.amount, method: item.method, status: item.status, createdAt: item.createdAt })); return { resellers, pending: pendingRequests, ledger }; }
    case "notifications.staffRecent": { await requireProfile(["admin", "manager"]); const staffRows = await getDocs(query(table("notifications"), where("userId", "==", null), orderBy("createdAt", "desc"), limit(20))); return staffRows.docs.map(withId); }
    case "notifications.unreadCount": { await requireProfile(["admin", "manager"]); const unreadRows = await getDocs(query(table("notifications"), where("userId", "==", null), where("isRead", "==", false))); return unreadRows.size; }
    case "notifications.myNotifications": { const profile = await ensureProfile(); if (!profile) return []; const myRows = await getDocs(query(table("notifications"), where("userId", "==", profile._id), orderBy("createdAt", "desc"), limit(20))); return myRows.docs.map(withId); }
    case "notifications.myUnreadCount": { const profile = await ensureProfile(); if (!profile) return 0; const myUnread = await getDocs(query(table("notifications"), where("userId", "==", profile._id), where("isRead", "==", false))); return myUnread.size; }
    case "reviews.forProduct": return (await all("reviews")).filter((item) => item.productId === args.productId).sort((a, b) => b.createdAt - a.createdAt);
    case "reviews.canReview": { const profile = await ensureProfile(); if (!profile) return false; const orders = (await all("orders")).filter((item) => item.userId === profile._id && item.status === "delivered"); return orders.some((order) => order.items?.some((item: AnyRecord) => item.productId === args.productId)); }
    default: return undefined;
  }
}

export async function runMutation(path: FirebaseApiPath, args: AnyRecord = {}) {
  const [module, operation] = path.split(".");
  try {
    return await runMutationInner(path, args);
  } finally {
    // Performance: any successful (or failed) mutation invalidates the read
    // micro-cache so the next query fetches fresh data.
    invalidateCache();
  }
}

async function runMutationInner(path: FirebaseApiPath, args: AnyRecord = {}) {
  const [module, operation] = path.split(".");
  switch (`${module}.${operation}`) {
    case "profile.save": { const profile = await requireProfile(); const ALLOWED_FIELDS = ["name", "phone", "division", "district", "address", "image"]; const patch = Object.fromEntries(Object.entries(args).filter(([key, value]) => ALLOWED_FIELDS.includes(key) && value !== undefined)); await updateDoc(document("users", profile._id), patch); return; }
    case "cart.add": { const profile = await requireProfile(); const product = await runQuery("catalog.byId", { id: args.productId }); if (!product?.isActive || product.stock <= 0) throw new Error("This piece is no longer available."); const rows = (await all("cartItems")).filter((item) => item.userId === profile._id && item.productId === args.productId && (item.size ?? "") === (args.size ?? product.sizes?.[0] ?? "") && (item.color ?? "") === (args.color ?? product.colors?.[0] ?? "")); const size = args.size ?? product.sizes?.[0]; const color = args.color ?? product.colors?.[0]; if (rows[0]) await updateDoc(document("cartItems", rows[0]._id), { quantity: Math.min(product.stock, 10, rows[0].quantity + (args.quantity ?? 1)) }); else { const row = await addDoc(table("cartItems"), { userId: profile._id, productId: args.productId, quantity: Math.min(product.stock, 10, Math.max(1, args.quantity ?? 1)), size, color, addedAt: now() }); return row.id; } return rows[0]?._id; }
    case "cart.updateQuantity": { const profile = await requireProfile(); const item = await getDoc(document("cartItems", args.itemId)); if (!item.exists() || item.data().userId !== profile._id) throw new Error("Item not found in your bag."); if (args.quantity <= 0) return deleteDoc(item.ref); const product = await runQuery("catalog.byId", { id: item.data().productId }); return updateDoc(item.ref, { quantity: Math.max(1, Math.min(10, Math.min(args.quantity, product?.stock ?? 10))) }); }
    case "cart.remove": { const profile = await requireProfile(); const item = await getDoc(document("cartItems", args.itemId)); if (!item.exists() || item.data().userId !== profile._id) throw new Error("Item not found in your bag."); return deleteDoc(item.ref); }
    case "cart.clear": { const profile = await requireProfile(); const rows = (await all("cartItems")).filter((item) => item.userId === profile._id); await Promise.all(rows.map((item) => deleteDoc(document("cartItems", item._id)))); return; }
    case "wishlist.toggle": { const profile = await requireProfile(); const rows = (await all("wishlistItems")).filter((item) => item.userId === profile._id && item.productId === args.productId); if (rows[0]) { await deleteDoc(document("wishlistItems", rows[0]._id)); return false; } await addDoc(table("wishlistItems"), { userId: profile._id, productId: args.productId, addedAt: now() }); return true; }
    case "wishlist.remove": { const profile = await requireProfile(); const item = await getDoc(document("wishlistItems", args.itemId)); if (!item.exists() || item.data().userId !== profile._id) throw new Error("Item not found."); return deleteDoc(item.ref); }
    case "orders.placeOrder": rateLimit("placeOrder", 5); return placeOrder(args);
    case "orders.setCourierInfo": { await requireProfile(["admin", "manager"]); const courierOrderRef = document("orders", args.orderId); const patch: AnyRecord = {}; if (args.courierName !== undefined) patch.courierName = clean(args.courierName, 60); if (args.consignmentCode !== undefined) patch.consignmentCode = clean(args.consignmentCode, 40); if (!Object.keys(patch).length) return; return updateDoc(courierOrderRef, patch); }
    case "orders.updateStatus": { const staff = await requireProfile(["admin", "manager"]); const orderRef = document("orders", args.orderId); const result = await runTransaction(db, async (transaction) => { const snapshot = await transaction.get(orderRef); if (!snapshot.exists()) throw new Error("Order not found."); const order = withId(snapshot); const history = [...(order.statusHistory ?? []), { status: args.status, at: now(), note: args.note ? clean(args.note, 160) : undefined }]; if (args.status === "cancelled" && order.status !== "cancelled") for (const item of order.items ?? []) { const productRef = document("products", item.productId); const productSnapshot = await transaction.get(productRef); if (productSnapshot.exists()) { const product = productSnapshot.data(); transaction.update(productRef, { stock: (product.stock ?? 0) + item.quantity, soldCount: Math.max(0, (product.soldCount ?? 0) - item.quantity) }); } } transaction.update(orderRef, { status: args.status, statusHistory: history, paymentStatus: args.paymentStatus ?? (args.status === "delivered" && order.paymentMethod === "cod" ? "paid" : order.paymentStatus) }); transaction.set(doc(collection(db, "notifications")), { type: "order", title: `${order.orderNumber} → ${args.status}`, message: `${staff.name ?? "Staff"} updated the order status`, orderId: args.orderId, isRead: false, createdAt: now() }); transaction.set(doc(collection(db, "notifications")), { type: "order", title: `${order.orderNumber} · ${args.status}`, message: `Your order status changed to ${args.status}.`, userId: order.userId, orderId: args.orderId, isRead: false, createdAt: now() }); return true; }); return result; }
    case "admin.setRole": { const admin = await requireProfile(["admin"]); const target = await getDoc(document("users", args.userId)); if (!target.exists()) throw new Error("User not found."); if (args.userId === admin._id && args.role !== "admin") throw new Error("You cannot remove your own administrator access."); const data = target.data(); const role = args.role; const patch: AnyRecord = { role }; if (role === "reseller" && !data.referralCode) patch.referralCode = `${clean(data.name || "NABI", 4).replace(/[^A-Za-z]/g, "").toUpperCase() || "NABI"}${Math.random().toString(36).slice(2, 6).toUpperCase()}`; return updateDoc(target.ref, patch); }
    case "reseller.requestWithdrawal": { rateLimit("requestWithdrawal", 3); const profile = await requireProfile(["reseller"]); const amount = Math.round(Number(args.amount)); if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid withdrawal amount."); const accountNumber = clean(args.accountNumber, 40).replace(/\s+/g, ""); if (accountNumber.length < 8) throw new Error("Enter the account number to pay into (bKash/Nagad number or bank account)."); const settingsRows = await all("settings"); const minSetting = Number(settingsRows.find((item) => item.key === "resellerMinWithdrawal")?.value); const minimum = Number.isFinite(minSetting) && minSetting >= 0 ? minSetting : 500; if (amount < minimum) throw new Error(`Minimum withdrawal amount is ৳${minimum.toLocaleString()}.`); const myOrders = (await all("orders")).filter((item) => item.resellerId === profile._id); const earned = myOrders.filter((item) => item.status === "delivered").reduce((sum, item) => sum + (item.commission ?? 0), 0); const adjustTotal = (await all("walletAdjustments")).filter((item) => item.userId === profile._id).reduce((sum, item) => sum + item.amount, 0); const myRequests = (await all("withdrawals")).filter((item) => item.userId === profile._id); const paidOut = myRequests.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0); const held = myRequests.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0); const balance = earned + adjustTotal - paidOut - held; if (amount > balance) throw new Error(`Insufficient balance. Available: ৳${Math.max(0, balance).toLocaleString()}.`); await addDoc(table("withdrawals"), { userId: profile._id, amount, method: args.method, accountNumber, status: "pending", createdAt: now() }); await addDoc(table("notifications"), { type: "message", title: "New withdrawal request", message: `${profile.name ?? profile.email ?? "Reseller"} requested ৳${amount.toLocaleString()} via ${args.method}.`, isRead: false, createdAt: now() }); return { ok: true }; }
    case "reseller.reviewWithdrawal": { const admin = await requireProfile(["admin"]); const withdrawalRef = document("withdrawals", args.withdrawalId); const snap = await getDoc(withdrawalRef); if (!snap.exists()) throw new Error("Withdrawal request not found."); const row = withId(snap); const reviewedBy = { reviewedBy: admin._id, reviewedAt: now() }; if (args.decision === "approve") { if (row.status !== "pending") throw new Error("Only pending requests can be approved."); await updateDoc(withdrawalRef, { status: "approved", note: args.note ? clean(args.note, 160) : row.note, ...reviewedBy }); return { ok: true }; } if (args.decision === "reject") { if (row.status === "paid") throw new Error("Paid withdrawals cannot be rejected."); await updateDoc(withdrawalRef, { status: "rejected", note: args.note ? clean(args.note, 160) : row.note, ...reviewedBy }); return { ok: true }; } if (row.status !== "approved") throw new Error("Approve the request before marking it paid."); await updateDoc(withdrawalRef, { status: "paid", note: args.note ? clean(args.note, 160) : row.note, ...reviewedBy }); return { ok: true }; }
    case "reseller.adjustWallet": { const admin = await requireProfile(["admin"]); const target = await getDoc(document("users", args.userId)); if (!target.exists()) throw new Error("Reseller not found."); const amount = Math.round(Math.abs(Number(args.amount))); if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount."); const type = args.type === "deduction" ? "deduction" : "topup"; if (type === "deduction") { const myOrders = (await all("orders")).filter((item) => item.resellerId === args.userId); const earned = myOrders.filter((item) => item.status === "delivered").reduce((sum, item) => sum + (item.commission ?? 0), 0); const adjustTotal = (await all("walletAdjustments")).filter((item) => item.userId === args.userId).reduce((sum, item) => sum + item.amount, 0); const myRequests = (await all("withdrawals")).filter((item) => item.userId === args.userId); const paidOut = myRequests.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0); const held = myRequests.filter((item) => item.status === "approved").reduce((sum, item) => sum + item.amount, 0); const balance = earned + adjustTotal - paidOut - held; if (balance < amount) throw new Error(`Cannot deduct more than the available balance (৳${Math.max(0, balance).toLocaleString()}).`); } await addDoc(table("walletAdjustments"), { userId: args.userId, amount: type === "topup" ? amount : -amount, type, note: args.note ? clean(args.note, 160) : "", createdBy: admin._id, createdAt: now() }); return { ok: true }; }
    case "admin.setBlocked": { const admin = await requireProfile(["admin"]); if (args.userId === admin._id) throw new Error("You cannot suspend your own account."); return updateDoc(document("users", args.userId), { blocked: args.blocked }); }
    case "catalog.create": case "catalog.update": { await requireProfile(["admin", "manager"]); const payload: AnyRecord = { ...args, name: clean(args.name, 140), description: clean(args.description), images: (args.images ?? []).filter(Boolean), stock: Math.max(0, Math.round(args.stock ?? 0)), price: Math.round(args.price), tags: (args.tags ?? []).map((tag: string) => tag.toLowerCase()), updatedAt: now() }; if (operation === "create") { payload.slug = clean(args.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + `-${Math.random().toString(36).slice(2, 5)}`; payload.rating = 0; payload.reviewCount = 0; payload.soldCount = 0; payload.createdAt = now(); delete payload.id; return (await addDoc(table("products"), payload)).id; } const id = args.id; delete payload.id; return updateDoc(document("products", id), payload); }
    case "catalog.toggleActive": { await requireProfile(["admin", "manager"]); const row = await getDoc(document("products", args.id)); if (!row.exists()) throw new Error("Product not found."); return updateDoc(row.ref, { isActive: !row.data().isActive }); }
    case "catalog.setStock": await requireProfile(["admin", "manager"]); return updateDoc(document("products", args.id), { stock: Math.max(0, Math.round(args.stock)) });
    case "catalog.remove": { await requireProfile(["admin", "manager"]); return deleteDoc(document("products", args.id)); }
    case "catalog.createCategory": { await requireProfile(["admin", "manager"]); return (await addDoc(table("categories"), { ...args, name: clean(args.name, 60), slug: clean(args.name).toLowerCase().replace(/[^a-z0-9]+/g, "-"), order: args.order ?? (await all("categories")).length, isActive: true })).id; }
    case "catalog.updateCategory": await requireProfile(["admin", "manager"]); return updateDoc(document("categories", args.id), { ...args, id: undefined });
    case "catalog.removeCategory": await requireProfile(["admin", "manager"]); return deleteDoc(document("categories", args.id));
    case "coupons.create": { await requireProfile(["admin", "manager"]); const cValue = Math.max(0, Math.round(Number(args.value) || 0)); const cType = args.type === "percent" ? "percent" : "fixed"; if (cType === "percent" && cValue > 90) throw new Error("Percentage discounts are capped at 90%."); const cMin = Math.max(0, Math.round(Number(args.minSpend) || 0)); return (await addDoc(table("coupons"), { ...args, value: cValue, type: cType, minSpend: cMin, code: clean(args.code, 24).replace(/[^A-Z0-9]/gi, "").toUpperCase(), isActive: true, usedCount: 0, createdAt: now() })).id; }
    case "coupons.setActive": await requireProfile(["admin", "manager"]); return updateDoc(document("coupons", args.id), { isActive: args.isActive });
    case "coupons.remove": await requireProfile(["admin", "manager"]); return deleteDoc(document("coupons", args.id));
    case "banners.upsert": { await requireProfile(["admin", "manager"]); const id = args.id ?? null; const payload: AnyRecord = { ...args, updatedAt: now() }; delete payload.id; if (id) return setDoc(document("banners", id), payload, { merge: true }); return (await addDoc(table("banners"), payload)).id; }
    case "banners.remove": await requireProfile(["admin", "manager"]); return deleteDoc(document("banners", args.id));
    case "popups.upsert": { await requireProfile(["admin", "manager"]); const pTitle = clean(args.title, 120); if (pTitle.length < 3) throw new Error("Popup title is too short."); const pImage = clean(args.image, 600); if (!pImage) throw new Error("Popup image is required."); const pFrequency = ["once", "daily", "always"].includes(args.frequency) ? args.frequency : "once"; const pStart = Math.round(Number(args.startAt)); if (!Number.isFinite(pStart)) throw new Error("Enter a valid start date."); const pEnd = args.endAt ? Math.round(Number(args.endAt)) : undefined; if (pEnd !== undefined && (!Number.isFinite(pEnd) || pEnd <= pStart)) throw new Error("The end date must be after the start date."); const pPayload: AnyRecord = { title: pTitle, description: args.description ? clean(args.description, 240) : "", image: pImage, ctaText: args.ctaText ? clean(args.ctaText, 40) : "", ctaUrl: args.ctaUrl ? clean(args.ctaUrl, 200) : "", frequency: pFrequency, startAt: pStart, endAt: pEnd ?? "", isActive: args.isActive === true, updatedAt: now() }; if (args.id) return setDoc(document("popups", args.id), pPayload, { merge: true }); return (await addDoc(table("popups"), { ...pPayload, createdAt: now() })).id; }
    case "popups.remove": await requireProfile(["admin", "manager"]); return deleteDoc(document("popups", args.id));
    case "legal.upsert": { await requireProfile(["admin", "manager"]); const pages = await all("legalPages"); const existing = pages.find((item) => item.slug === args.slug); return setDoc(document("legalPages", existing?._id ?? args.slug), { ...args, updatedAt: now() }, { merge: true }); }
    case "settings.update": { await requireProfile(["admin"]); const entries = Array.isArray(args.values) ? args.values : Object.entries(args).map(([key, value]) => ({ key, value })); await Promise.all(entries.map((entry: AnyRecord) => setDoc(document("settings", entry.key), { key: entry.key, value: String(entry.value ?? "") }))); return; }
    case "notifications.markAllRead": await requireProfile(["admin", "manager"]); { const rows = (await all("notifications")).filter((item) => !item.userId && !item.isRead); await Promise.all(rows.map((item) => updateDoc(document("notifications", item._id), { isRead: true }))); return; }
    case "notifications.markMyRead": { const profile = await requireProfile(); const myRows = (await all("notifications")).filter((item) => item.userId === profile._id && !item.isRead); await Promise.all(myRows.map((item) => updateDoc(document("notifications", item._id), { isRead: true }))); return; }
    case "reviews.add": { const profile = await requireProfile(); const payload = { ...args, userId: profile._id, authorName: profile.name ?? profile.email ?? "Customer", createdAt: now() }; const id = (await addDoc(table("reviews"), payload)).id; const product = await getDoc(document("products", args.productId)); if (product.exists()) { const reviews = await getDocs(query(table("reviews"), where("productId", "==", args.productId))); const rating = reviews.docs.reduce((sum, row) => sum + row.data().rating, 0) / reviews.size; await updateDoc(product.ref, { rating: Math.round(rating * 10) / 10, reviewCount: reviews.size }); } return id; }
    case "seed.ensureDemoData": return await seedDemoData();
    default: return undefined;
  }
}

export async function runAction(path: FirebaseApiPath, args: AnyRecord = {}) {
  if (path === "notify.dispatchOrderAlert") return { delivered: false, provider: "firebase" };
  return runMutation(path, args);
}

export async function uploadProductImage(file: Blob, path = `products/${crypto.randomUUID()}`) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function removeProductImage(path: string) {
  return deleteObject(ref(storage, path));
}

async function seedDemoData() {
  await requireProfile(["admin", "manager"]);
  if ((await getDocs(query(table("products"), limit(1)))).size) return { seeded: false };
  const timestamp = now();
  const categories = ["saree", "three-piece", "kurti-tops", "dress-gown", "abaya-hijab", "accessories"].map((slug, order) => ({ name: slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()), slug, order, isActive: true }));
  await Promise.all(categories.map((category) => setDoc(document("categories", category.slug), category)));
  const demoProducts = [
    { name: "Rajkonna Jamdani Saree", categorySlug: "saree", price: 6850, stock: 12, images: ["https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80"], sizes: ["One Size"], colors: ["Ivory & Gold"], tags: ["jamdani", "saree"], isFeatured: true },
    { name: "Linen Everyday Kurti", categorySlug: "kurti-tops", price: 1890, stock: 42, images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"], sizes: ["S", "M", "L", "XL"], colors: ["Off White", "Olive"], tags: ["kurti", "linen"], isFeatured: true },
  ];
  await Promise.all(demoProducts.map((product) => setDoc(doc(collection(db, "products")), { ...product, slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: "A considered piece from NABILA FASHION.", rating: 0, reviewCount: 0, soldCount: 0, isActive: true, createdAt: timestamp })));
  return { seeded: true };
}
