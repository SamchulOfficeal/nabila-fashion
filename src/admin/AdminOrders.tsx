import { Seo } from "@/components/Seo";
import { SmartImage } from "@/components/SmartImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/services/firebase/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useShop } from "@/context/app-context";
import { cn, formatDateTime } from "@/lib/utils";
import { useMutation, useQuery } from "@/services/firebase/hooks";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2, Phone, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  confirmed: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  processing: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  shipped: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  delivered: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/15 text-destructive",
};

type OrderStatus = (typeof STATUSES)[number];

export function AdminOrders() {
  const { money } = useShop();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const orders = useQuery(api.orders.staffList, {
    status: status || undefined,
    search: search || undefined,
  });
  const updateStatus = useMutation(api.orders.updateStatus);

  const onUpdate = async (
    orderId: Doc<"orders">["_id"],
    next: OrderStatus,
    paymentStatus?: "paid" | "unpaid",
  ) => {
    try {
      await updateStatus({
        orderId,
        status: next,
        paymentStatus,
        note: `Updated from the admin panel`,
      });
      toast.success(`Order moved to ${next}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update order");
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Orders" />

      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Orders
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Confirm by phone, then move each order through the delivery pipeline.
        </p>
      </div>

      <div className="glass flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Search className="ml-1 size-4 text-muted-foreground" strokeWidth={1.8} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order number, customer or phone"
            className="h-10 border-transparent bg-transparent shadow-none"
          />
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatus("")}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              status === "" ? "bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            All
          </button>
          {STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={cn(
                "shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                status === option
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {orders === undefined ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="glass grid place-items-center gap-2 rounded-3xl py-20 text-center">
          <p className="font-display text-lg font-semibold">No orders here</p>
          <p className="text-xs text-muted-foreground">
            New cash-on-delivery orders will appear the moment they are placed.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {orders.map((order) => (
            <div key={order._id} className="glass overflow-hidden rounded-3xl">
              <button
                type="button"
                onClick={() => setOpen(open === order._id ? null : order._id)}
                className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-semibold">
                      {order.orderNumber}
                    </p>
                    <Badge
                      className={cn(
                        "rounded-full border-transparent text-[10px] font-semibold uppercase",
                        STATUS_COLORS[order.status] ?? "",
                      )}
                    >
                      {order.status}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full text-[10px] font-semibold uppercase"
                    >
                      {order.paymentMethod} · {order.paymentStatus}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {order.customerName} · {order.phone} · {order.district},{" "}
                    {order.division} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-base font-semibold">
                    {money(order.total)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      open === order._id && "rotate-180",
                    )}
                    strokeWidth={2}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {open === order._id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden border-t border-border/50"
                  >
                    <div className="grid gap-5 p-4 lg:grid-cols-[1.3fr_1fr]">
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div
                            key={`${item.productId}-${index}`}
                            className="flex items-center gap-3"
                          >
                            <SmartImage
                              src={item.image}
                              alt={item.name}
                              width={140}
                              className="size-12 shrink-0 rounded-xl"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-medium">
                                {item.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {[item.size, item.color].filter(Boolean).join(" · ")} ×{" "}
                                {item.quantity}
                              </p>
                            </div>
                            <span className="text-sm font-medium">
                              {money(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}

                        <div className="space-y-1.5 border-t border-border/50 pt-3 text-xs">
                          <Row label="Subtotal" value={money(order.subtotal)} />
                          <Row
                            label="Delivery"
                            value={
                              order.deliveryCharge === 0
                                ? "Free"
                                : money(order.deliveryCharge)
                            }
                          />
                          {order.discount > 0 && (
                            <Row
                              label={`Discount ${order.couponCode ?? ""}`}
                              value={`−${money(order.discount)}`}
                            />
                          )}
                          {order.commission ? (
                            <Row
                              label={`Reseller commission ${order.resellerCode ?? ""}`}
                              value={money(order.commission)}
                            />
                          ) : null}
                          <div className="flex items-center justify-between border-t border-border/50 pt-2">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-display text-lg font-semibold">
                              {money(order.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="glass-soft rounded-2xl p-4">
                          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                            Ship to
                          </p>
                          <p className="mt-2 text-sm font-medium">
                            {order.customerName}
                          </p>
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="size-3" strokeWidth={1.8} />
                            {order.phone}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {order.address}, {order.district}, {order.division}
                          </p>
                          {order.note && (
                            <p className="mt-2 text-[11px] text-muted-foreground italic">
                              “{order.note}”
                            </p>
                          )}
                        </div>

                        <div className="glass-soft rounded-2xl p-4">
                          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                            Update status
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {STATUSES.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => void onUpdate(order._id, option)}
                                disabled={order.status === option}
                                className={cn(
                                  "cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-medium capitalize transition-colors",
                                  order.status === option
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent",
                                )}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                          <div className="mt-3 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void onUpdate(order._id, order.status, "paid")}
                              className="cursor-pointer rounded-full text-xs"
                            >
                              Mark payment received
                            </Button>
                          </div>
                        </div>

                        <div className="glass-soft rounded-2xl p-4">
                          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase">
                            Timeline
                          </p>
                          <ol className="mt-2 space-y-2">
                            {order.statusHistory.map((event, index) => (
                              <li
                                key={`${event.status}-${index}`}
                                className="flex items-start justify-between gap-3 text-xs"
                              >
                                <span className="font-medium capitalize">
                                  {event.status}
                                </span>
                                <span className="text-right text-[10px] text-muted-foreground">
                                  {formatDateTime(event.at)}
                                  {event.note ? ` · ${event.note}` : ""}
                                </span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
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
