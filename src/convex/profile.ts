import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanText, getViewer, requireUser, roleOf } from "./lib/access";
import { divisionNames } from "./lib/delivery";

/** Signed in customer profile — returns null instead of throwing so the shell can render safely. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await getViewer(ctx);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name ?? "",
      email: user.email ?? "",
      image: user.image ?? "",
      phone: user.phone ?? "",
      division: user.division ?? "",
      district: user.district ?? "",
      address: user.address ?? "",
      referralCode: user.referralCode ?? "",
      role: roleOf(user),
      blocked: user.blocked ?? false,
      isAnonymous: user.isAnonymous ?? false,
    };
  },
});

function validateName(value: string): string {
  const name = cleanText(value, 80);
  if (name.length < 2) throw new Error("Please enter your full name.");
  return name;
}

function validatePhone(value: string): string {
  const phone = cleanText(value, 20).replace(/[^0-9+]/g, "");
  if (phone.replace(/\D/g, "").length < 11) {
    throw new Error("Enter a valid 11 digit mobile number.");
  }
  return phone;
}

/** Saves shipping details so checkout can prefill them next time. */
export const save = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    division: v.optional(v.string()),
    district: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.division !== undefined && !divisionNames().includes(args.division)) {
      throw new Error("Please choose a valid delivery division.");
    }
    if (args.address !== undefined && cleanText(args.address, 240).length < 8) {
      throw new Error("Please enter a full street address.");
    }

    await ctx.db.patch(user._id, {
      name: args.name !== undefined ? validateName(args.name) : user.name,
      phone: args.phone !== undefined ? validatePhone(args.phone) : user.phone,
      division: args.division ?? user.division,
      district:
        args.district !== undefined ? cleanText(args.district, 60) : user.district,
      address:
        args.address !== undefined ? cleanText(args.address, 240) : user.address,
    });
  },
});
