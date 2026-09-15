import { mutation } from "./_generated/server";
import { DEFAULTS } from "./settings";

const photo = (id: string, width = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

const CATEGORIES = [
  {
    name: "Saree",
    nameBn: "শাড়ি",
    slug: "saree",
    tagline: "Handloom, jamdani & muslin drapes",
    image: photo("1610030469983-98e550d6193c", 700),
    order: 0,
  },
  {
    name: "Three Piece",
    nameBn: "থ্রি পিস",
    slug: "three-piece",
    tagline: "Unstitched & ready-to-wear sets",
    image: photo("1594633312681-425c7b97ccd1", 700),
    order: 1,
  },
  {
    name: "Kurti & Tops",
    nameBn: "কুর্তি ও টপস",
    slug: "kurti-tops",
    tagline: "Everyday elegance, breathable cottons",
    image: photo("1595777457583-95e059d581b8", 700),
    order: 2,
  },
  {
    name: "Dress & Gown",
    nameBn: "ড্রেস ও গাউন",
    slug: "dress-gown",
    tagline: "Occasion wear & evening silhouettes",
    image: photo("1496747611176-843222e1e57c", 700),
    order: 3,
  },
  {
    name: "Abaya & Hijab",
    nameBn: "আবায়া ও হিজাব",
    slug: "abaya-hijab",
    tagline: "Modest luxury, premium fabrics",
    image: photo("1572804013309-59a88b7e92f1", 700),
    order: 4,
  },
  {
    name: "Bags & Jewellery",
    nameBn: "ব্যাগ ও গহনা",
    slug: "accessories",
    tagline: "Finishing touches that elevate",
    image: photo("1584917865442-de89df76afd3", 700),
    order: 5,
  },
];

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"];
const ONE_SIZE = ["One Size"];

const PRODUCTS: {
  name: string;
  nameBn?: string;
  categorySlug: string;
  description: string;
  descriptionBn?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  sizes: string[];
  colors: string[];
  tags: string[];
  stock: number;
  isFeatured?: boolean;
  flashSalePrice?: number;
  flashSaleHours?: number;
  resellerCommission: number;
}[] = [
  {
    name: "Rajkonna Jamdani Saree",
    nameBn: "রাজকন্যা জামদানি শাড়ি",
    categorySlug: "saree",
    description:
      "A heirloom-grade jamdani woven on the looms of Narayanganj. Airy half-silk drape, handworked floral buti across the body and a rich contrast pallu finished with zari. Comes with a matching unstitched blouse piece.",
    descriptionBn:
      "নারায়ণগঞ্জের তাঁতে বোনা ঐতিহ্যবাহী জামদানি। হালকা হাফ-সিল্ক, হাতে বোনা ফুলেল বুটিদার ডিজাইন ও জরির পাড়। সাথে ম্যাচিং ব্লাউজ পিস।",
    price: 6850,
    compareAtPrice: 8900,
    images: [photo("1610030469983-98e550d6193c"), photo("1583391733956-3750e0ff4e8b")],
    sizes: ["One Size"],
    colors: ["Ivory & Gold", "Navy & Coral", "Maroon"],
    tags: ["jamdani", "saree", "festive", "handloom"],
    stock: 12,
    isFeatured: true,
    resellerCommission: 400,
  },
  {
    name: "Muslin Dhakai Saree",
    nameBn: "মসলিন ঢাকাই শাড়ি",
    categorySlug: "saree",
    description:
      "Featherweight muslin with a hand-finished selvedge. The six-yard drape falls like water and takes up almost no space in a suitcase — our most requested wedding-season piece.",
    price: 9450,
    compareAtPrice: 11200,
    images: [photo("1583391733956-3750e0ff4e8b"), photo("1610030469983-98e550d6193c")],
    sizes: ["One Size"],
    colors: ["Blush", "Powder Blue", "Charcoal"],
    tags: ["muslin", "saree", "bridal"],
    stock: 6,
    isFeatured: true,
    resellerCommission: 550,
  },
  {
    name: "Pastel Cotton Tangail Saree",
    categorySlug: "saree",
    description:
      "Soft cotton tangail with a fine striped border. Comfortable for long summer days and easy to drape for everyday wear.",
    price: 2890,
    compareAtPrice: 3600,
    images: [photo("1490481651871-ab68de25d43d")],
    sizes: ["One Size"],
    colors: ["Mint", "Peach", "Sky"],
    tags: ["tangail", "saree", "cotton", "daily"],
    stock: 24,
    flashSalePrice: 2450,
    flashSaleHours: 72,
    resellerCommission: 180,
  },
  {
    name: "Noir Chiffon Three Piece",
    categorySlug: "three-piece",
    description:
      "Unstitched three piece in flowy chiffon with embroidered neckline and sequin-scattered dupatta. Cut, stitch and drape it exactly your way.",
    price: 4250,
    compareAtPrice: 5200,
    images: [photo("1594633312681-425c7b97ccd1"), photo("1483985988355-763728e1935b")],
    sizes: ["Unstitched"],
    colors: ["Noir", "Deep Teal", "Wine"],
    tags: ["three-piece", "unstitched", "party"],
    stock: 18,
    isFeatured: true,
    resellerCommission: 260,
  },
  {
    name: "Ivory Embroidered Ready Set",
    categorySlug: "three-piece",
    description:
      "Stitched and ready in premium cotton silk. Straight kameez with side slits, cigarette pants and a hand-embroidered organza dupatta.",
    price: 5290,
    images: [photo("1483985988355-763728e1935b"), photo("1594633312681-425c7b97ccd1")],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Ivory", "Sage", "Dusty Rose"],
    tags: ["three-piece", "ready", "festive"],
    stock: 15,
    resellerCommission: 330,
  },
  {
    name: "Silk Blend Party Three Piece",
    categorySlug: "three-piece",
    description:
      "Lustrous silk-blend set with zari detailing on the hem and a scalloped dupatta edge. A quiet statement for evening events.",
    price: 7450,
    compareAtPrice: 8600,
    images: [photo("1525507119028-ed4c629a60a3")],
    sizes: ["S", "M", "L"],
    colors: ["Emerald", "Midnight", "Rose Gold"],
    tags: ["three-piece", "silk", "party"],
    stock: 9,
    resellerCommission: 450,
  },
  {
    name: "Linen Everyday Kurti",
    nameBn: "লিনেন কুর্তি",
    categorySlug: "kurti-tops",
    description:
      "Breathable European linen in a relaxed A-line cut. Side pockets, wooden buttons and a hem that works over pants or palazzos.",
    price: 1890,
    compareAtPrice: 2400,
    images: [photo("1595777457583-95e059d581b8"), photo("1487222477894-8943e31ef7b2")],
    sizes: CLOTHING_SIZES,
    colors: ["Off White", "Clay", "Olive", "Indigo"],
    tags: ["kurti", "linen", "daily"],
    stock: 42,
    flashSalePrice: 1590,
    flashSaleHours: 48,
    resellerCommission: 140,
  },
  {
    name: "Handblock Cotton Kurti",
    categorySlug: "kurti-tops",
    description:
      "Block-printed by artisans in Rajshahi using azo-free dyes. Straight silhouette with a mandarin collar and three-quarter sleeves.",
    price: 2150,
    images: [photo("1487222477894-8943e31ef7b2")],
    sizes: CLOTHING_SIZES,
    colors: ["Mustard", "Brick", "Teal"],
    tags: ["kurti", "handblock", "cotton"],
    stock: 36,
    isFeatured: true,
    resellerCommission: 160,
  },
  {
    name: "Pleated Georgette Top",
    categorySlug: "kurti-tops",
    description:
      "A soft-shoulder top with fine knife pleats and a hidden back zip. Pairs equally well with denim or a silk skirt.",
    price: 2450,
    compareAtPrice: 2990,
    images: [photo("1469334031218-e382a71b716b")],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Champagne", "Black", "Blush"],
    tags: ["top", "western", "office"],
    stock: 28,
    resellerCommission: 180,
  },
  {
    name: "Emerald Velvet Gown",
    categorySlug: "dress-gown",
    description:
      "Floor-length velvet with a fitted bodice, subtle sweetheart neckline and a soft train. Fully lined with concealed boning for structure.",
    price: 12900,
    compareAtPrice: 15500,
    images: [photo("1496747611176-843222e1e57c"), photo("1539109136881-3be0616acf4b")],
    sizes: ["S", "M", "L"],
    colors: ["Emerald", "Oxblood", "Navy"],
    tags: ["gown", "velvet", "bridal", "evening"],
    stock: 5,
    isFeatured: true,
    resellerCommission: 900,
  },
  {
    name: "Champagne Sequin Cocktail Dress",
    categorySlug: "dress-gown",
    description:
      "All-over champagne sequins on a stretch mesh base. Midi length with a slit and a soft cowl back.",
    price: 6350,
    images: [photo("1539109136881-3be0616acf4b")],
    sizes: ["XS", "S", "M", "L"],
    colors: ["Champagne", "Silver", "Rose"],
    tags: ["dress", "party", "sequin"],
    stock: 14,
    resellerCommission: 480,
  },
  {
    name: "Tiered Floral Midi Dress",
    categorySlug: "dress-gown",
    description:
      "Printed chiffon midi with three soft tiers, smocked waist and flutter sleeves. Breezy, photogenic and travel friendly.",
    price: 3450,
    compareAtPrice: 4200,
    images: [photo("1445205170230-053b83016050")],
    sizes: CLOTHING_SIZES,
    colors: ["Blush Floral", "Blue Floral"],
    tags: ["dress", "midi", "casual"],
    stock: 31,
    flashSalePrice: 2890,
    flashSaleHours: 36,
    resellerCommission: 240,
  },
  {
    name: "Premium Nida Abaya",
    nameBn: "প্রিমিয়াম নিদা আবায়া",
    categorySlug: "abaya-hijab",
    description:
      "Japanese nida that drapes without clinging. Straight cut, hidden popper placket, deep side pockets and a matte satin finish.",
    price: 4150,
    compareAtPrice: 4900,
    images: [photo("1572804013309-59a88b7e92f1"), photo("1596755094514-f87e34085b2c")],
    sizes: ["52", "54", "56", "58", "60"],
    colors: ["Jet Black", "Deep Navy", "Mocha"],
    tags: ["abaya", "modest", "nida"],
    stock: 22,
    isFeatured: true,
    resellerCommission: 300,
  },
  {
    name: "Pleated Chiffon Hijab",
    categorySlug: "abaya-hijab",
    description:
      "Textured pleated chiffon with a hand-rolled hem. Holds a crease-free pinless drape all day.",
    price: 790,
    images: [photo("1596755094514-f87e34085b2c")],
    sizes: [ONE_SIZE[0]],
    colors: ["Dusty Pink", "Sand", "Charcoal", "Sage", "White"],
    tags: ["hijab", "chiffon", "modest"],
    stock: 80,
    flashSalePrice: 690,
    flashSaleHours: 24,
    resellerCommission: 70,
  },
  {
    name: "Quilted Chain Handbag",
    categorySlug: "accessories",
    description:
      "Structured vegan leather with diamond quilting, gold-tone chain strap and a suede-lined interior with card slots.",
    price: 3290,
    compareAtPrice: 3990,
    images: [photo("1584917865442-de89df76afd3"), photo("1566174053879-31528523f8ae")],
    sizes: [ONE_SIZE[0]],
    colors: ["Black", "Caramel", "Ivory"],
    tags: ["bag", "handbag", "accessory"],
    stock: 19,
    isFeatured: true,
    resellerCommission: 250,
  },
  {
    name: "Pearl Drop Earrings",
    categorySlug: "accessories",
    description:
      "Freshwater-look pearls on a gold-plated brass drop. Lightweight enough for a full evening of wear.",
    price: 1150,
    images: [photo("1515562141207-7a88fb7ce338")],
    sizes: [ONE_SIZE[0]],
    colors: ["Gold", "Silver"],
    tags: ["jewellery", "earrings", "gift"],
    stock: 44,
    resellerCommission: 90,
  },
  {
    name: "Block Heel Leather Sandals",
    categorySlug: "accessories",
    description:
      "Soft leather uppers with a cushioned footbed and a stable 6cm block heel. Made for weddings that run long.",
    price: 3790,
    compareAtPrice: 4500,
    images: [photo("1543163521-1bf539c55dd2")],
    sizes: ["36", "37", "38", "39", "40", "41"],
    colors: ["Nude", "Black", "Tan"],
    tags: ["shoes", "heels", "leather"],
    stock: 26,
    resellerCommission: 280,
  },
];

const BANNERS = [
  {
    eyebrow: "Autumn / Winter Edit",
    title: "Glass-clear luxury, made in Bangladesh",
    subtitle:
      "Handloom sarees, nida abayas and occasion gowns from the ateliers we trust. Free delivery over ৳4,000.",
    image: photo("1490481651871-ab68de25d43d", 1600),
    ctaLabel: "Shop the edit",
    ctaHref: "/shop",
    order: 0,
    isActive: true,
  },
  {
    eyebrow: "Flash Sale · 72 hours",
    title: "Up to 30% off festive drapes",
    subtitle: "Jamdani, tangail and ready three-piece sets at studio prices.",
    image: photo("1610030469983-98e550d6193c", 1600),
    ctaLabel: "See flash deals",
    ctaHref: "/shop?flash=1",
    order: 1,
    isActive: true,
  },
  {
    eyebrow: "Modest luxury",
    title: "The abaya wardrobe, reimagined",
    subtitle: "Japanese nida, hidden plackets, deep pockets — cut for everyday wear.",
    image: photo("1572804013309-59a88b7e92f1", 1600),
    ctaLabel: "Explore abayas",
    ctaHref: "/shop?category=abaya-hijab",
    order: 2,
    isActive: true,
  },
];

const COUPONS = [
  {
    code: "NABILA10",
    description: "10% off your first order",
    type: "percent" as const,
    value: 10,
    minSpend: 2000,
  },
  {
    code: "EID500",
    description: "৳500 off festive orders",
    type: "fixed" as const,
    value: 500,
    minSpend: 3500,
  },
  {
    code: "WELCOME15",
    description: "15% off orders over ৳3,000",
    type: "percent" as const,
    value: 15,
    minSpend: 3000,
  },
];

const LEGAL = [
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: `NABILA FASHION respects your privacy.

What we collect
- Account details: name, email address and mobile number.
- Order details: delivery address, district, division and order history.
- Technical data: device, browser and pages visited, used only to improve the store.

How we use it
Your information is used to process and deliver orders, verify cash-on-delivery customers by phone, prevent fraud, and send order updates. We never sell customer data.

Payments
Cash on delivery orders are collected by our courier partner. No card data is stored on our servers.

Your rights
You may request a copy of your data, ask for corrections, or request deletion by writing to support. Marketing messages are opt-in and can be stopped at any time.

Data retention
Order records are retained for accounting and warranty purposes for five years.`,
  },
  {
    slug: "terms-conditions",
    title: "Terms & Conditions",
    content: `By shopping with NABILA FASHION you agree to the following terms.

Orders
- Every order is confirmed by phone or SMS before dispatch.
- Prices are shown in Bangladeshi Taka (BDT). USD amounts are indicative conversions.
- We may cancel an order if an item is mispriced, out of stock, or if delivery details cannot be verified.

Delivery
- Inside Dhaka: 1–3 working days. Outside Dhaka: 3–5 working days.
- Delivery charge is calculated automatically by division and is free above ৳4,000.

Accounts
- You are responsible for keeping your sign-in details secure.
- Reseller accounts must not misrepresent pricing, availability or brand affiliation.

Intellectual property
All photography, copy and design on this store belongs to NABILA FASHION and may not be reused without written permission.`,
  },
  {
    slug: "refund-policy",
    title: "Refund & Exchange Policy",
    content: `We want you to love what you wear.

Exchange window
- Requests are accepted within 7 days of delivery.
- The piece must be unworn, unwashed, with tags and original packaging intact.

Not eligible
- Stitched or altered items.
- Innerwear, hijabs and jewellery for hygiene reasons.
- Sale and flash-sale pieces marked "final sale".

Damaged or wrong item
Share an unboxing video or photos within 48 hours of delivery. We will arrange a free replacement pickup and dispatch the correct piece at our cost.

Refunds
- Cash on delivery orders are refunded via bKash, Nagad or bank transfer within 5 working days of approval.
- Delivery charges are refunded only when the fault is ours.

How to start
Open your Account → Orders, choose the order and tap "Request return". Our team confirms within 24 hours.`,
  },
];

/**
 * Idempotent bootstrap. Runs only while the catalogue is empty so the storefront
 * always has real content on a fresh deployment.
 */
export const ensureDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").take(1);
    if (existing.length > 0) return { seeded: false };

    const now = Date.now();

    for (const category of CATEGORIES) {
      await ctx.db.insert("categories", { ...category, isActive: true });
    }

    for (const product of PRODUCTS) {
      await ctx.db.insert("products", {
        name: product.name,
        nameBn: product.nameBn,
        slug: product.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-"),
        description: product.description,
        descriptionBn: product.descriptionBn,
        categorySlug: product.categorySlug,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        images: product.images,
        sizes: product.sizes,
        colors: product.colors,
        tags: product.tags,
        stock: product.stock,
        sku: `NF-${product.categorySlug.slice(0, 3).toUpperCase()}-${Math.round(product.price / 10)}`,
        rating: 0,
        reviewCount: 0,
        soldCount: Math.floor(Math.random() * 40) + 4,
        isActive: true,
        isFeatured: product.isFeatured ?? false,
        flashSalePrice: product.flashSalePrice,
        flashSaleEndsAt: product.flashSaleHours
          ? now + product.flashSaleHours * 60 * 60 * 1000
          : undefined,
        resellerCommission: product.resellerCommission,
        createdAt: now - Math.floor(Math.random() * 40) * 24 * 60 * 60 * 1000,
      });
    }

    for (const banner of BANNERS) await ctx.db.insert("banners", banner);

    for (const coupon of COUPONS) {
      await ctx.db.insert("coupons", {
        ...coupon,
        isActive: true,
        usedCount: 0,
        createdAt: now,
      });
    }

    for (const page of LEGAL) {
      await ctx.db.insert("legalPages", { ...page, updatedAt: now });
    }

    for (const [key, value] of Object.entries(DEFAULTS)) {
      await ctx.db.insert("settings", { key, value });
    }

    return { seeded: true };
  },
});
