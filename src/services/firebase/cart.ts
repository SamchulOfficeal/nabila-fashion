/**
 * Legacy API wrappers kept for reference. The storefront uses the `api`
 * reference objects (`@/services/firebase/api`) with the query/mutation hooks
 * directly, so these functions are intentionally not exported to app code.
 */
import type { Id } from "@/convex/_generated/dataModel";
import { runMutation, runQuery } from "@/services/firestore";

const getCart = () => runQuery("cart.myCart");
const getCartSummary = () => runQuery("cart.summary");
const addToCart = (productId: Id<"products">, quantity = 1, size?: string, color?: string) =>
  runMutation("cart.add", { productId, quantity, size, color });
const updateCartQuantity = (itemId: Id<"cartItems">, quantity: number) =>
  runMutation("cart.updateQuantity", { itemId, quantity });
const removeFromCart = (itemId: Id<"cartItems">) => runMutation("cart.remove", { itemId });
const clearCart = () => runMutation("cart.clear");

const getWishlistIds = () => runQuery("wishlist.ids");
const getWishlist = () => runQuery("wishlist.myWishlist");
const toggleWishlist = (productId: Id<"products">) => runMutation("wishlist.toggle", { productId });
const removeFromWishlist = (itemId: Id<"wishlistItems">) => runMutation("wishlist.remove", { itemId });

void getCart;
void getCartSummary;
void addToCart;
void updateCartQuantity;
void removeFromCart;
void clearCart;
void getWishlistIds;
void getWishlist;
void toggleWishlist;
void removeFromWishlist;
