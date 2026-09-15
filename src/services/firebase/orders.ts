import type { Id } from "@/convex/_generated/dataModel";
import { runAction, runMutation, runQuery } from "@/services/firestore";

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

export const placeOrder = (input: CheckoutInput) => runMutation("orders.placeOrder", input);
export const getMyOrders = () => runQuery("orders.myOrders");
export const getOrderByNumber = (orderNumber: string) => runQuery("orders.byNumber", { orderNumber });
export const listStaffOrders = (args: { status?: string; search?: string } = {}) => runQuery("orders.staffList", args);
export const updateOrderStatus = (orderId: Id<"orders">, status: string, note?: string, paymentStatus?: string) =>
  runMutation("orders.updateStatus", { orderId, status, note, paymentStatus });
export const validateCoupon = (code: string, subtotal: number) => runQuery("coupons.validate", { code, subtotal });
export const dispatchOrderAlert = (payload: Record<string, unknown>) => runAction("notify.dispatchOrderAlert", payload);
