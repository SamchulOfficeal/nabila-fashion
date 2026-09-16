import { runMutation, runQuery } from "@/services/firestore";

export const getOverview = () => runQuery("admin.overview");
export const listUsers = (search?: string) => runQuery("admin.listUsers", { search });
export const setUserRole = (userId: string, role: string) => runMutation("admin.setRole", { userId, role });
export const setUserBlocked = (userId: string, blocked: boolean) => runMutation("admin.setBlocked", { userId, blocked });
export const getResellerSummary = () => runQuery("admin.resellerSummary");
export const listCoupons = () => runQuery("coupons.staffList");
export const createCoupon = (payload: Record<string, unknown>) => runMutation("coupons.create", payload);
export const setCouponActive = (id: string, isActive: boolean) => runMutation("coupons.setActive", { id, isActive });
export const deleteCoupon = (id: string) => runMutation("coupons.remove", { id });
export const listBanners = () => runQuery("banners.staffList");
export const saveBanner = (payload: Record<string, unknown>) => runMutation("banners.upsert", payload);
export const deleteBanner = (id: string) => runMutation("banners.remove", { id });
export const markNotificationsRead = () => runMutation("notifications.markAllRead");
