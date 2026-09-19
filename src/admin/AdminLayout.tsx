import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { useAuth } from "@/hooks/use-auth";
import { useStaffNotifications } from "@/hooks/use-notifications";
import { cn, formatDateTime } from "@/lib/utils";
import { useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  HandCoins,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { to: "/admin/customers", label: "Users & roles", icon: Users, adminOnly: true },
  { to: "/admin/resellers", label: "Resellers", icon: HandCoins, adminOnly: true },
  { to: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { to: "/admin/legal", label: "Legal pages", icon: FileText },
  { to: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function AdminLayout() {
  const { t, storeName } = useShop();
  const brandInitial = storeName.charAt(0).toUpperCase();
  const profile = useQuery(api.profile.get);
  // Phase 2: real-time bell via Firestore onSnapshot (replaces polling).
  const { items: notifications, unreadCount: unread, markAllRead } = useStaffNotifications();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const isAdmin = profile?.role === "admin";
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);

  const sidebar = (
    <div className="flex h-full flex-col gap-1">
      <Link
        to="/"
        className="mb-4 flex items-center gap-2.5 rounded-2xl px-3 py-2 transition-colors hover:bg-accent"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
          {brandInitial}
        </span>
        <span className="flex flex-col leading-none">
          <span className="font-display text-sm font-semibold tracking-tight">
            {storeName.replace(/\s*FASHION$/i, "")}
          </span>
          <span className="text-[9px] font-medium tracking-[0.3em] text-muted-foreground">
            CONTROL
          </span>
        </span>
      </Link>

      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground/75 hover:bg-accent hover:text-foreground",
            )
          }
        >
          <item.icon className="size-4" strokeWidth={1.8} />
          {item.label}
        </NavLink>
      ))}

      <div className="mt-auto space-y-1 pt-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent"
        >
          <Store className="size-4" strokeWidth={1.8} />
          Back to store
        </Link>
        <button
          type="button"
          onClick={() => void signOut().then(() => navigate("/"))}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4" strokeWidth={1.8} />
          {t("nav.signOut")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-3 py-4 sm:px-5 lg:px-8">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="glass sticky top-4 rounded-3xl p-4">{sidebar}</div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass flex items-center gap-3 rounded-3xl p-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Menu"
                className="cursor-pointer lg:hidden"
              >
                <Menu className="size-5" strokeWidth={1.7} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="glass-strong w-[80%] sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="font-display">Control centre</SheetTitle>
              </SheetHeader>
              <div className="p-4">{sidebar}</div>
            </SheetContent>
          </Sheet>

          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold tracking-tight">
              {profile?.name || profile?.email || "Staff"}
            </p>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {profile?.role ?? "staff"} access
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu open={bellOpen} onOpenChange={setBellOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Notifications"
                  className="relative cursor-pointer"
                >
                  <Bell className="size-5" strokeWidth={1.7} />
                  {(unread ?? 0) > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="cursor-pointer text-[11px] font-normal text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <p className="px-2 py-4 text-xs text-muted-foreground">
                    No alerts yet. New orders appear here instantly.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <DropdownMenuItem
                      key={item._id}
                      className="flex cursor-pointer flex-col items-start gap-1 py-2.5"
                    >
                      <span className="flex w-full items-center gap-2">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            item.isRead ? "bg-muted-foreground/40" : "bg-primary",
                          )}
                        />
                        <span className="text-xs font-medium">{item.title}</span>
                      </span>
                      <span className="pl-3.5 text-[11px] leading-4 text-muted-foreground">
                        {item.message}
                      </span>
                      <span className="pl-3.5 text-[10px] text-muted-foreground/70">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Badge
              variant="outline"
              className="hidden rounded-full text-[10px] font-semibold tracking-wide uppercase sm:inline-flex"
            >
              {profile?.role ?? "staff"}
            </Badge>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.main
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 pb-10"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
