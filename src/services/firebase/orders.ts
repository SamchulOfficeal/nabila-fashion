export type CheckoutInput = {
  customerName: string;
  phone: string;
  division: string;
  district: string;
  address: string;
  note?: string;
  couponCode?: string;
  resellerCode?: string;
  paymentMethod: "cod" | "online";
};

import type { Id } from "@/convex/_generated/dataModel";
import { runAction, runMutation } from "@/services/firestore";

export const placeOrder = (input: CheckoutInput) => runMutation("orders.placeOrder", input);
export const updateOrderStatus = (orderId: Id<"orders">, status: string, note?: string, paymentStatus?: string) =>
  runMutation("orders.updateStatus", { orderId, status, note, paymentStatus });
export const dispatchOrderAlert = (payload: Record<string, unknown>) => runAction("notify.dispatchOrderAlert", payload);
