import type { Id } from "@/convex/_generated/dataModel";
import { runMutation, runQuery } from "@/services/firestore";

export const getCart = () => runQuery("cart.myCart");
export const getCartSummary = () => runQuery("cart.summary");
export const addToCart = (productId: Id<"products">, quantity = 1, size?: string, color?: string) =>
  runMutation("cart.add", { productId, quantity, size, color });
export const updateCartQuantity = (itemId: Id<"cartItems">, quantity: number) =>
  runMutation("cart.updateQuantity", { itemId, quantity });
export const removeFromCart = (itemId: Id<"cartItems">) => runMutation("cart.remove", { itemId });
export const clearCart = () => runMutation("cart.clear");

export const getWishlistIds = () => runQuery("wishlist.ids");
export const getWishlist = () => runQuery("wishlist.myWishlist");
export const toggleWishlist = (productId: Id<"products">) => runMutation("wishlist.toggle", { productId });
export const removeFromWishlist = (itemId: Id<"wishlistItems">) => runMutation("wishlist.remove", { itemId });
