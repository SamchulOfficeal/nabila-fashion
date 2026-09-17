import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { RequireAuth } from "@/components/RequireAuth";
import { ShopProvider } from "@/context/app-context";
import { RoleRoute } from "@/routes/role-route";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import React, { StrictMode, useEffect, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const Shop = lazy(() => import("./pages/Shop.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));
const Cart = lazy(() => import("./pages/Cart.tsx"));
const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.tsx"));
const Orders = lazy(() => import("./pages/Orders.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const Reseller = lazy(() => import("./pages/Reseller.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const AdminLayout = lazy(() =>
  import("./admin/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const AdminOverview = lazy(() =>
  import("./admin/AdminOverview").then((module) => ({ default: module.AdminOverview })),
);
const AdminProducts = lazy(() =>
  import("./admin/AdminProducts").then((module) => ({ default: module.AdminProducts })),
);
const AdminOrders = lazy(() =>
  import("./admin/AdminOrders").then((module) => ({ default: module.AdminOrders })),
);
const AdminUsers = lazy(() =>
  import("./admin/AdminUsers").then((module) => ({ default: module.AdminUsers })),
);
const AdminMarketing = lazy(() =>
  import("./admin/AdminMarketing").then((module) => ({ default: module.AdminMarketing })),
);
const AdminLegal = lazy(() =>
  import("./admin/AdminLegal").then((module) => ({ default: module.AdminLegal })),
);
const AdminSettings = lazy(() =>
  import("./admin/AdminSettings").then((module) => ({ default: module.AdminSettings })),
);
const AdminResellers = lazy(() =>
  import("./admin/AdminResellers").then((module) => ({ default: module.AdminResellers })),
);
const ResellerDashboard = lazy(() => import("./pages/ResellerDashboard.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading…</div>
    </div>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in WebContainer environment). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[WebContainer preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <ShopProvider>
        <BrowserRouter>
          <RouteSyncer />
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              {/* Storefront */}
              <Route element={<StoreLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/reseller" element={<Reseller />} />
                <Route
                  path="/reseller/dashboard"
                  element={
                    <RequireAuth>
                      <ResellerDashboard />
                    </RequireAuth>
                  }
                />
                <Route path="/legal/:slug" element={<Legal />} />
                <Route
                  path="/wishlist"
                  element={
                    <RequireAuth>
                      <Wishlist />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <RequireAuth>
                      <Checkout />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/orders"
                  element={
                    <RequireAuth>
                      <Orders />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/account"
                  element={
                    <RequireAuth>
                      <Account />
                    </RequireAuth>
                  }
                />
              </Route>

              {/* Admin control centre — never publicly reachable */}
              <Route
                path="/admin"
                element={
                  <RoleRoute roles={["admin", "manager"]}>
                    <AdminLayout />
                  </RoleRoute>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route
                  path="customers"
                  element={
                    <RoleRoute roles={["admin"]}>
                      <AdminUsers />
                    </RoleRoute>
                  }
                />
                <Route path="marketing" element={<AdminMarketing />} />
                <Route
                  path="resellers"
                  element={
                    <RoleRoute roles={["admin"]}>
                      <AdminResellers />
                    </RoleRoute>
                  }
                />
                <Route path="legal" element={<AdminLegal />} />
                <Route
                  path="settings"
                  element={
                    <RoleRoute roles={["admin"]}>
                      <AdminSettings />
                    </RoleRoute>
                  }
                />
              </Route>

              <Route path="/auth" element={<AuthPage redirectAfterAuth="/account" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </ShopProvider>
    </RootErrorBoundary>
  </StrictMode>
);
