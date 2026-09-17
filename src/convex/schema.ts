import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// NABILA FASHION role system.
// admin    -> full control of the store
// manager  -> product + order management only
// reseller -> commission based selling (referral code)
// customer -> normal buyer
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  RESELLER: "reseller",
  CUSTOMER: "customer",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MANAGER),
  v.literal(ROLES.RESELLER),
  v.literal(ROLES.CUSTOMER),
);
export type Role = Infer<typeof roleValidator>;

export const staffRoleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.MANAGER),
);

export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
);
export type OrderStatus = Infer<typeof orderStatusValidator>;

export const categoryNameValidator = v.object({
  en: v.string(),
  bn: v.optional(v.string()),
});

export const orderItemValidator = v.object({
  productId: v.id("products"),
  name: v.string(),
  image: v.string(),
  price: v.number(),
  quantity: v.number(),
  size: v.optional(v.string()),
  color: v.optional(v.string()),
});

export const orderEventValidator = v.object({
  status: orderStatusValidator,
  at: v.number(),
  note: v.optional(v.string()),
});

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      phone: v.optional(v.string()),
      division: v.optional(v.string()),
      district: v.optional(v.string()),
      address: v.optional(v.string()),
      referralCode: v.optional(v.string()),
      blocked: v.optional(v.boolean()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    categories: defineTable({
      name: v.string(),
      nameBn: v.optional(v.string()),
      slug: v.string(),
      tagline: v.optional(v.string()),
      image: v.optional(v.string()),
      parentSlug: v.optional(v.string()),
      order: v.number(),
      isActive: v.boolean(),
    })
      .index("slug", ["slug"])
      .index("parentSlug", ["parentSlug"]),

    products: defineTable({
      name: v.string(),
      nameBn: v.optional(v.string()),
      slug: v.string(),
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
      rating: v.number(),
      reviewCount: v.number(),
      soldCount: v.number(),
      isActive: v.boolean(),
      isFeatured: v.boolean(),
      flashSalePrice: v.optional(v.number()),
      flashSaleEndsAt: v.optional(v.number()),
      resellerCommission: v.optional(v.number()),
      createdAt: v.number(),
    })
      .index("slug", ["slug"])
      .index("categorySlug", ["categorySlug"])
      .index("isActive", ["isActive"])
      .index("isFeatured", ["isFeatured"]),

    cartItems: defineTable({
      userId: v.id("users"),
      productId: v.id("products"),
      quantity: v.number(),
      size: v.optional(v.string()),
      color: v.optional(v.string()),
      addedAt: v.number(),
    })
      .index("userId", ["userId"])
      .index("productId", ["productId"])
      .index("by_user_product", ["userId", "productId"]),

    wishlistItems: defineTable({
      userId: v.id("users"),
      productId: v.id("products"),
      addedAt: v.number(),
    })
      .index("userId", ["userId"])
      .index("productId", ["productId"])
      .index("by_user_product", ["userId", "productId"]),

    orders: defineTable({
      orderNumber: v.string(),
      userId: v.id("users"),
      customerName: v.string(),
      customerEmail: v.optional(v.string()),
      phone: v.string(),
      division: v.string(),
      district: v.string(),
      address: v.string(),
      note: v.optional(v.string()),
      items: v.array(orderItemValidator),
      subtotal: v.number(),
      deliveryCharge: v.number(),
      discount: v.number(),
      total: v.number(),
      couponCode: v.optional(v.string()),
      resellerCode: v.optional(v.string()),
      resellerId: v.optional(v.id("users")),
      commission: v.optional(v.number()),
      paymentMethod: v.union(v.literal("cod"), v.literal("online"), v.literal("bkash"), v.literal("nagad")),
      paymentReference: v.optional(v.string()),
      courierName: v.optional(v.string()),
      consignmentCode: v.optional(v.string()),
      paymentStatus: v.union(v.literal("unpaid"), v.literal("paid")),
      status: orderStatusValidator,
      statusHistory: v.array(orderEventValidator),
      currency: v.string(),
      createdAt: v.number(),
    })
      .index("userId", ["userId"])
      .index("status", ["status"])
      .index("orderNumber", ["orderNumber"]),

    reviews: defineTable({
      productId: v.id("products"),
      userId: v.id("users"),
      authorName: v.string(),
      rating: v.number(),
      comment: v.string(),
      createdAt: v.number(),
    })
      .index("productId", ["productId"])
      .index("userId", ["userId"]),

    coupons: defineTable({
      code: v.string(),
      description: v.optional(v.string()),
      type: v.union(v.literal("percent"), v.literal("fixed")),
      value: v.number(),
      minSpend: v.number(),
      isActive: v.boolean(),
      expiresAt: v.optional(v.number()),
      usageLimit: v.optional(v.number()),
      usedCount: v.number(),
      createdAt: v.number(),
    }).index("code", ["code"]),

    banners: defineTable({
      title: v.string(),
      subtitle: v.optional(v.string()),
      eyebrow: v.optional(v.string()),
      image: v.string(),
      ctaLabel: v.optional(v.string()),
      ctaHref: v.optional(v.string()),
      order: v.number(),
      isActive: v.boolean(),
    }).index("isActive", ["isActive"]),

    legalPages: defineTable({
      slug: v.string(),
      title: v.string(),
      content: v.string(),
      updatedAt: v.number(),
    }).index("slug", ["slug"]),

    notifications: defineTable({
      type: v.union(
        v.literal("order"),
        v.literal("message"),
        v.literal("stock"),
      ),
      title: v.string(),
      message: v.string(),
      orderId: v.optional(v.id("orders")),
      isRead: v.boolean(),
      createdAt: v.number(),
    }).index("isRead", ["isRead"]),

    settings: defineTable({
      key: v.string(),
      value: v.string(),
    }).index("key", ["key"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
