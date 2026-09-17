import { api } from "@/services/firebase/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export function useCart() {
  const summary = useQuery(api.cart.summary);
  const items = useQuery(api.cart.myCart);
  const addMutation = useMutation(api.cart.add);
  const updateMutation = useMutation(api.cart.updateQuantity);
  const removeMutation = useMutation(api.cart.remove);
  const clearMutation = useMutation(api.cart.clear);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Optimistic overlay: bumps applied on click, cleared as soon as the server
  // summary arrives so the UI never waits a full write + refetch round-trip.
  const [pendingAdds, setPendingAdds] = useState<{ count: number; subtotal: number }>({
    count: 0,
    subtotal: 0,
  });
  const [addingId, setAddingId] = useState<Id<"products"> | null>(null);

  useEffect(() => {
    setPendingAdds({ count: 0, subtotal: 0 });
  }, [summary?.count, summary?.subtotal]);

  const requireAuth = useCallback(
    (intent: string) => {
      if (isAuthenticated) return true;
      toast.error(`Please sign in to ${intent}`);
      const returnTo =
        typeof window === "undefined" ? "/shop" : window.location.pathname;
      navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);
      return false;
    },
    [isAuthenticated, navigate],
  );

  const add = useCallback(
    async (
      productId: Id<"products">,
      options?: { quantity?: number; size?: string; color?: string; silent?: boolean; priceHint?: number },
    ) => {
      if (!requireAuth("start your bag")) return false;
      const quantity = options?.quantity ?? 1;
      setAddingId(productId);
      setPendingAdds((pending) => ({
        count: pending.count + quantity,
        subtotal: pending.subtotal + quantity * (options?.priceHint ?? 0),
      }));
      try {
        await addMutation({
          productId,
          quantity,
          size: options?.size,
          color: options?.color,
        });
        if (!options?.silent) toast.success("Added to your bag");
        return true;
      } catch (error) {
        // Roll back the optimistic bump when the server rejected the write.
        setPendingAdds((pending) => ({
          count: Math.max(0, pending.count - quantity),
          subtotal: Math.max(0, pending.subtotal - quantity * (options?.priceHint ?? 0)),
        }));
        toast.error(error instanceof Error ? error.message : "Could not add to bag");
        return false;
      } finally {
        setAddingId(null);
      }
    },
    [addMutation, requireAuth],
  );

  const updateQuantity = useCallback(
    async (itemId: Id<"cartItems">, quantity: number) => {
      try {
        await updateMutation({ itemId, quantity });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update bag");
      }
    },
    [updateMutation],
  );

  const remove = useCallback(
    async (itemId: Id<"cartItems">) => {
      try {
        await removeMutation({ itemId });
        toast.success("Removed from your bag");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove item");
      }
    },
    [removeMutation],
  );

  const clear = useCallback(async () => {
    try {
      await clearMutation({});
    } catch (error) {
      console.error(error);
    }
  }, [clearMutation]);

  return {
    items: items ?? [],
    count: (summary?.count ?? 0) + pendingAdds.count,
    lineCount: summary?.lines ?? 0,
    subtotal: (summary?.subtotal ?? 0) + pendingAdds.subtotal,
    isLoading: items === undefined || summary === undefined,
    addingId,
    add,
    updateQuantity,
    remove,
    clear,
  };
}
