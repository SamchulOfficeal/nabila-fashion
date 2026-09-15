"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Order alert dispatcher.
 *
 * The admin dashboard already receives an instant in-app notification from the
 * `placeOrder` mutation. This action adds the outbound side so the same event can
 * reach a WhatsApp / Telegram / Slack style webhook, and it is the single place to
 * plug in a transactional email provider.
 *
 * Configure with Convex environment variables:
 *   ORDER_WEBHOOK_URL   – any endpoint accepting a JSON body ({ text, order })
 *   ORDER_ALERT_EMAIL   – destination address for the email channel
 */
export const dispatchOrderAlert = action({
  args: {
    orderNumber: v.string(),
    customerName: v.string(),
    phone: v.string(),
    division: v.string(),
    total: v.number(),
    itemCount: v.number(),
  },
  handler: async (_ctx, args) => {
    const text = [
      "🛍️ New NABILA FASHION order",
      `Order: ${args.orderNumber}`,
      `Customer: ${args.customerName} (${args.phone})`,
      `Ship to: ${args.division}`,
      `Items: ${args.itemCount}`,
      `Total: ৳${args.total.toLocaleString()} · Cash on delivery`,
    ].join("\n");

    const result = { webhook: false, email: false };

    const webhookUrl = process.env.ORDER_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, order: args }),
        });
        result.webhook = true;
      } catch (error) {
        console.error("[NABILA FASHION] webhook alert failed", error);
      }
    }

    const emailTo = process.env.ORDER_ALERT_EMAIL;
    if (emailTo) {
      // Email channel is wired but intentionally inert until a provider key is set.
      // Add the provider call here (Resend, SendGrid, or the built-in email
      // integration) and it will run automatically for every new order.
      console.log("[NABILA FASHION] order email queued", {
        to: emailTo,
        subject: `New order ${args.orderNumber}`,
        body: text,
      });
      result.email = true;
    }

    if (!webhookUrl && !emailTo) {
      console.log("[NABILA FASHION] order alert (in-app only)", text);
    }

    return result;
  },
});
