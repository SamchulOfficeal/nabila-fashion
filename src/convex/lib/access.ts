import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AppUser = Doc<"users">;
export type ViewerCtx = QueryCtx | MutationCtx;
export type AppRole = "admin" | "manager" | "reseller" | "customer";

/** Returns the signed in user document, or null when signed out. */
export async function getViewer(ctx: ViewerCtx): Promise<AppUser | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return await ctx.db.get(userId);
}

export function roleOf(user: AppUser | null): AppRole {
  return (user?.role ?? "customer") as AppRole;
}

export function isStaff(user: AppUser | null): boolean {
  const role = roleOf(user);
  return role === "admin" || role === "manager";
}

/** Throws unless the caller is a signed in, non-suspended user. */
export async function requireUser(ctx: ViewerCtx): Promise<AppUser> {
  const user = await getViewer(ctx);
  if (!user) throw new Error("Please sign in to continue.");
  if (user.blocked) throw new Error("This account has been suspended.");
  return user;
}

/** Throws unless the caller is an admin or a manager. */
export async function requireStaff(ctx: ViewerCtx): Promise<AppUser> {
  const user = await requireUser(ctx);
  if (!isStaff(user)) {
    throw new Error("You do not have access to store management.");
  }
  return user;
}

/** Throws unless the caller is an admin. */
export async function requireAdmin(ctx: ViewerCtx): Promise<AppUser> {
  const user = await requireUser(ctx);
  if (roleOf(user) !== "admin") {
    throw new Error("This action requires an administrator account.");
  }
  return user;
}

/** Small url-safe slug helper shared by catalog + admin mutations. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

/** Defensive string validation used across mutations. */
export function cleanText(value: string, max = 400): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}
