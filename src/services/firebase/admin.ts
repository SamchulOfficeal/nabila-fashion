import { runMutation } from "@/services/firestore";

export const createCoupon = (payload: Record<string, unknown>) => runMutation("coupons.create", payload);
export const setCouponActive = (id: string, isActive: boolean) => runMutation("coupons.setActive", { id, isActive });
