import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/firebase/api";
import { useShop } from "@/context/app-context";
import { cn, formatCompact, formatDateTime } from "@/lib/utils";
import { useQuery } from "@/services/firebase/hooks";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  Loader2,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  processing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  shipped: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
};

export function AdminOverview() {
  const { money, currency, usdRate } = useShop();
  const data = useQuery(api.admin.overview);

  if (data === undefined) {
    return (
      <div className="grid place-items-center py-32">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxRevenue = Math.max(...data.salesByDay.map((day) => day.revenue), 1);

  const stats = [
    {
      label: "Revenue",
      value: money(data.revenue),
      hint: `${data.aov > 0 ? money(data.aov) : "—"} average order`,
      icon: Wallet,
    },
    {
      label: "Orders",
      value: String(data.orderCount),
      hint: `${data.pendingOrders} awaiting confirmation`,
      icon: ShoppingCart,
    },
    {
      label: "Units sold",
      value: String(data.unitsSold),
      hint: `${data.deliveredOrders} delivered`,
      icon: TrendingUp,
    },
    {
      label: "Customers",
      value: String(data.customerCount),
      hint: `${data.resellerCount} resellers`,
      icon: Users,
    },
    {
      label: "Products",
      value: String(data.productCount),
      hint: `${data.activeProducts} live · ${data.outOfStock} out of stock`,
      icon: Package,
    },
    {
      label: "COD outstanding",
      value: String(data.codOutstanding),
      hint: "Unpaid on delivery",
      icon: Boxes,
    },
  ];

  return (
    <div className="space-y-5">
      <Seo title="Admin overview" />

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Store overview
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Live figures from {data.orderCount} orders and {data.productCount} products ·
          showing in {currency}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.04 }}
            className="glass rounded-3xl p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                {stat.label}
              </span>
              <span className="grid size-8 place-items-center rounded-xl bg-brand-blush text-primary">
                <stat.icon className="size-4" strokeWidth={1.8} />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{stat.hint}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Last 7 days
            </h2>
            <span className="text-[11px] text-muted-foreground">
              Peak {formatCompact(maxRevenue, currency, usdRate)}
            </span>
          </div>
          <div className="mt-6 flex h-48 items-end gap-2">
            {data.salesByDay.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex w-full flex-1 items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (day.revenue / maxRevenue) * 100)}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full rounded-t-xl bg-gradient-to-t from-primary/45 to-primary"
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {day.label}
                </span>
                <span className="text-[10px] font-semibold tabular-nums">
                  {formatCompact(day.revenue, currency, usdRate)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Order pipeline
          </h2>
          <div className="mt-4 space-y-2.5">
            {data.statusBreakdown.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between rounded-2xl px-3 py-2 odd:bg-muted/50"
              >
                <Badge
                  className={cn(
                    "rounded-full border-transparent text-[10px] font-semibold uppercase",
                    STATUS_COLORS[row.status] ?? "",
                  )}
                >
                  {row.status}
                </Badge>
                <span className="font-display text-base font-semibold">{row.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl bg-muted/60 p-3">
            <p className="text-[11px] text-muted-foreground">
              Average rating across {data.reviewCount} reviews
            </p>
            <p className="font-display text-xl font-semibold">
              {data.averageRating > 0 ? `${data.averageRating} / 5` : "—"}
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass rounded-3xl p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Top products
          </h2>
          <div className="mt-4 space-y-3">
            {data.topProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No sales recorded yet.
              </p>
            ) : (
              data.topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {product.units} units
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {money(product.revenue)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" strokeWidth={1.8} />
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Low stock
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {data.lowStock.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Every piece has healthy inventory.
              </p>
            ) : (
              data.lowStock.map((product) => (
                <Link
                  key={product._id}
                  to="/admin/products"
                  className="flex items-center gap-3 rounded-2xl p-1.5 transition-colors hover:bg-accent"
                >
                  <SmartImage
                    src={product.image}
                    alt={product.name}
                    width={120}
                    className="size-10 shrink-0 rounded-xl"
                  />
                  <span className="line-clamp-1 flex-1 text-sm font-medium">
                    {product.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full text-[10px] font-semibold",
                      product.stock === 0 ? "text-destructive" : "text-amber-600",
                    )}
                  >
                    {product.stock} left
                  </Badge>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Recent orders
            </h2>
            <Link
              to="/admin/orders"
              className="text-[11px] font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.recentOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground">No orders yet.</p>
            ) : (
              data.recentOrders.map((order) => (
                <div key={order._id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.orderNumber}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {order.customerName} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{money(order.total)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
