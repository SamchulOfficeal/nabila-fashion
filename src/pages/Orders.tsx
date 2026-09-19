import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/services/firebase/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { printInvoice } from "@/lib/invoice";
import { cn, formatDateTime } from "@/lib/utils";
import { useOrderStatusAlerts } from "@/hooks/use-notifications";
import { useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, Loader2, Package, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const STATUS_FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  processing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  shipped: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function Orders() {
  const { t, money, storeName } = useShop();
  const orders = useQuery(api.orders.myOrders);
  const [open, setOpen] = useState<string | null>(null);

  // Phase 2: live status-change alerts (toast + browser notification + chime)
  // while this page is open — fixes the stale Orders page gap.
  useOrderStatusAlerts(true);
  if (orders === undefined) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
      <Seo title="My orders" description={`Track your ${storeName} orders.`} />

      <header>
        <span className="text-[10px] font-semibold tracking-[0.24em] text-primary uppercase">
          {t("orders.timeline")}
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("orders.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {orders.length} order{orders.length === 1 ? "" : "s"} placed with {storeName}
        </p>
      </header>

      {orders.length === 0 ? (
        <div className="glass mt-8 grid place-items-center gap-4 rounded-[2rem] px-6 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-brand-blush text-primary">
            <Package className="size-7" strokeWidth={1.5} />
          </span>
          <div>
            <p className="font-display text-xl font-semibold">{t("orders.empty")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("orders.emptyHint")}</p>
          </div>
          <Button asChild className="cursor-pointer rounded-full px-6">
            <Link to="/shop">{t("cta.shopNow")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              open={open === order._id}
              onToggle={() => setOpen(open === order._id ? null : order._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  open,
  onToggle,
}: {
  order: Doc<"orders">;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, money, storeName, logoUrl, supportPhone } = useShop();
  const currentIndex = STATUS_FLOW.indexOf(
    order.status as (typeof STATUS_FLOW)[number],
  );

  const downloadInvoice = () => {
    try {
      printInvoice(order, { storeName, logoUrl, supportPhone });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the invoice");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass overflow-hidden rounded-3xl"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="glass-soft grid size-11 shrink-0 place-items-center rounded-2xl">
            <Truck className="size-5 text-primary" strokeWidth={1.7} />
          </span>
          <div>
            <p className="font-display text-sm font-semibold tracking-tight">
              {order.orderNumber}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatDateTime(order.createdAt)} · {order.items.length} {t("orders.items")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            className={cn(
              "rounded-full border-transparent text-[10px] font-semibold uppercase",
              STATUS_STYLES[order.status] ?? "",
            )}
          >
            {order.status}
          </Badge>
          <span className="font-display text-base font-semibold">{money(order.total)}</span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            strokeWidth={2}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border/50"
          >
            <div className="grid gap-5 p-4 sm:grid-cols-[1.4fr_1fr]">
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center gap-3">
                    <SmartImage
                      src={item.image}
                      alt={item.name}
                      width={140}
                      className="size-14 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" · ")} × {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {money(item.price * item.quantity)}
                    </span>
                  </div>
                ))}

                <div className="space-y-2 border-t border-border/50 pt-3 text-sm">
                  <Row label={t("bag.subtotal")} value={money(order.subtotal)} />
                  <Row
                    label={t("bag.delivery")}
                    value={order.deliveryCharge === 0 ? t("common.free") : money(order.deliveryCharge)}
                  />
                  {order.discount > 0 && (
                    <Row
                      label={`${t("bag.discount")} ${order.couponCode ? `(${order.couponCode})` : ""}`}
                      value={`−${money(order.discount)}`}
                    />
                  )}
                  <div className="flex items-center justify-between border-t border-border/50 pt-2">
                    <span className="text-muted-foreground">{t("bag.total")}</span>
                    <span className="font-display text-lg font-semibold">
                      {money(order.total)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="glass-soft rounded-2xl p-4">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                    {t("checkout.shipping")}
                  </p>
                  <p className="mt-2 text-sm font-medium">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">{order.phone}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {order.address}, {order.district}, {order.division}
                  </p>
                  {order.note && (
                    <p className="mt-2 text-[11px] text-muted-foreground italic">
                      “{order.note}”
                    </p>
                  )}
                  <p className="mt-3 text-[11px] font-medium text-primary">
                    {order.paymentMethod === "cod"
                      ? t("checkout.cod")
                      : order.paymentMethod === "bkash"
                        ? "bKash"
                        : order.paymentMethod === "nagad"
                          ? "Nagad"
                          : t("checkout.online")} ·{" "}
                    {order.paymentStatus}
                  </p>
                  {order.consignmentCode && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Consignment: <strong className="text-foreground">{order.consignmentCode}</strong> · {order.courierName}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadInvoice}
                    className="mt-3 w-full cursor-pointer rounded-full text-xs"
                  >
                    <FileText className="size-3.5" strokeWidth={1.8} />
                    Invoice / receipt
                  </Button>
                </div>

                <div className="glass-soft rounded-2xl p-4">
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                    {t("orders.timeline")}
                  </p>
                  {order.status === "cancelled" ? (
                    <p className="mt-2 text-sm text-destructive">
                      This order was cancelled. Stock has been returned to the studio.
                    </p>
                  ) : (
                    <ol className="mt-3 space-y-3">
                      {STATUS_FLOW.map((status, index) => {
                        const done = index <= currentIndex;
                        const event = order.statusHistory.find(
                          (entry) => entry.status === status,
                        );
                        return (
                          <li key={status} className="flex items-start gap-3">
                            <span
                              className={cn(
                                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-bold",
                                done
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {index + 1}
                            </span>
                            <span>
                              <span
                                className={cn(
                                  "block text-xs font-medium capitalize",
                                  !done && "text-muted-foreground",
                                )}
                              >
                                {status}
                              </span>
                              {event && (
                                <span className="block text-[10px] text-muted-foreground">
                                  {formatDateTime(event.at)}
                                </span>
                              )}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
