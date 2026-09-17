import { runQuery, removeProductImage, uploadProductImage } from "@/services/firestore";

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

export const listCategories = () => runQuery("catalog.categories");
export const getCategoryBySlug = (slug: string) => runQuery("catalog.categoryBySlug", { slug });

export { uploadProductImage, removeProductImage };
