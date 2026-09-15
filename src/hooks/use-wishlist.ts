import { api } from "@/services/firebase/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export function useWishlist() {
  const ids = useQuery(api.wishlist.ids);
  const items = useQuery(api.wishlist.myWishlist);
  const toggleMutation = useMutation(api.wishlist.toggle);
  const removeMutation = useMutation(api.wishlist.remove);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const saved = useMemo(() => new Set(ids ?? []), [ids]);

  const toggle = useCallback(
    async (productId: Id<"products">) => {
      if (!isAuthenticated) {
        toast.error("Please sign in to save favourites");
        const returnTo =
          typeof window === "undefined" ? "/shop" : window.location.pathname;
        navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      try {
        const added = await toggleMutation({ productId });
        toast.success(added ? "Saved to wishlist" : "Removed from wishlist");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update wishlist");
      }
    },
    [isAuthenticated, navigate, toggleMutation],
  );

  const remove = useCallback(
    async (itemId: Id<"wishlistItems">) => {
      try {
        await removeMutation({ itemId });
        toast.success("Removed from wishlist");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update wishlist");
      }
    },
    [removeMutation],
  );

  return {
    items: items ?? [],
    count: ids?.length ?? 0,
    isLoading: items === undefined,
    isSaved: (productId: Id<"products">) => saved.has(productId),
    toggle,
    remove,
  };
}
