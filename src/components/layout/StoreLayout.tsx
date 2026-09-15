import { BottomNav } from "@/components/layout/BottomNav";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { ChatWidget } from "@/components/layout/ChatWidget";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";

/** Shared storefront chrome: sticky header, routed page, footer and mobile bottom nav. */
export function StoreLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <CartDrawer />
      <ChatWidget />
    </div>
  );
}
