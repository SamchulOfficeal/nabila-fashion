import type { Id } from "@/convex/_generated/dataModel";
import { runMutation, runQuery, removeProductImage, uploadProductImage } from "@/services/firestore";

export type ProductFilters = {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  sort?: "newest" | "price-asc" | "price-desc" | "rating" | "popular";
  flashSaleOnly?: boolean;
  featuredOnly?: boolean;
  inStockOnly?: boolean;
  limit?: number;
};

export const listProducts = (filters: ProductFilters = {}) => runQuery("catalog.list", filters);
export const getProductBySlug = (slug: string) => runQuery("catalog.bySlug", { slug });
export const getProductById = (id: Id<"products">) => runQuery("catalog.byId", { id });
export const listCategories = () => runQuery("catalog.categories");
export const getCategoryBySlug = (slug: string) => runQuery("catalog.categoryBySlug", { slug });
export const listFeaturedProducts = (limit = 8) => runQuery("catalog.featured", { limit });
export const listFlashSaleProducts = () => runQuery("catalog.flashSales");
export const searchProducts = (term: string) => runQuery("catalog.suggestions", { term });
export const listRelatedProducts = (categorySlug: string, excludeId?: string) =>
  runQuery("catalog.related", { categorySlug, excludeId });

export const createProduct = (payload: Record<string, unknown>) => runMutation("catalog.create", payload);
export const updateProduct = (id: string, payload: Record<string, unknown>) =>
  runMutation("catalog.update", { id, ...payload });
export const deleteProduct = (id: string) => runMutation("catalog.remove", { id });
export const setProductStock = (id: string, stock: number) => runMutation("catalog.setStock", { id, stock });
export const toggleProductActive = (id: string) => runMutation("catalog.toggleActive", { id });
export const createCategory = (payload: Record<string, unknown>) => runMutation("catalog.createCategory", payload);
export const updateCategory = (id: string, payload: Record<string, unknown>) =>
  runMutation("catalog.updateCategory", { id, ...payload });
export const deleteCategory = (id: string) => runMutation("catalog.removeCategory", { id });

export { uploadProductImage, removeProductImage };
