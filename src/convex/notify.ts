"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Order alert + customer confirmation dispatcher.
 *
 * Channels:
 *  - Customer order-confirmation email (via Resend) when RESEND_API_KEY is set
 *    and the checkout passed a customerEmail.
 *  - Admin webhook (Slack/WhatsApp/Telegram style) when ORDER_WEBHOOK_URL is set.
 *  - Admin alert email to ORDER_ALERT_EMAIL through the same Resend account.
 *
 * Configure with environment variables:
 *   RESEND_API_KEY      – from resend.com/api-keys
 *   EMAIL_FROM          – e.g. "NABILA FASHION <orders@yourdomain.com>"
 *   SITE_URL            – public site origin, used for links inside the email
 *   ORDER_WEBHOOK_URL   – any endpoint accepting a JSON body ({ text, order })
 *   ORDER_ALERT_EMAIL   – destination address for the staff alert email
 */

type EmailPayload = { to: string; subject: string; html: string };

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.EMAIL_FROM ?? "NABILA FASHION <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...payload }),
  });

  if (!response.ok) {
    console.error("[NABILA FASHION] email send failed", {
      to: payload.to,
      status: response.status,
      detail: (await response.text()).slice(0, 400),
    });
    return false;
  }
  return true;
}

function confirmationEmail(args: {
  orderNumber: string;
  customerName: string;
  total: number;
  itemCount: number;
  division: string;
}): EmailPayload {
  const siteUrl = process.env.SITE_URL;
  const track = siteUrl
    ? `<a href="${siteUrl}/orders" style="display:inline-block;margin-top:18px;background:#9d174d;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-weight:600;font-size:14px;">Track my order</a>`
    : "";

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#faf7f5;font-family:Georgia,'Times New Roman',serif;color:#2b1722;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(43,23,34,0.08);">
      <tr>
        <td style="background:#9d174d;padding:28px 32px;">
          <p style="margin:0;color:#f8e8ee;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;">NABILA FASHION</p>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#ffffff;">Thank you, ${args.customerName}!</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px;">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">
            Your order <strong>${args.orderNumber}</strong> is confirmed and being prepared.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.9;">
            <tr><td style="color:#8a7480;">Items</td><td align="right" style="font-weight:600;">${args.itemCount}</td></tr>
            <tr><td style="color:#8a7480;">Ship to</td><td align="right" style="font-weight:600;">${args.division}</td></tr>
            <tr><td style="color:#8a7480;">Payment</td><td align="right" style="font-weight:600;">Cash on delivery</td></tr>
            <tr>
              <td style="border-top:1px solid #f0e4ea;padding-top:10px;color:#8a7480;">Total payable</td>
              <td align="right" style="border-top:1px solid #f0e4ea;padding-top:10px;font-size:18px;font-weight:700;color:#9d174d;">৳${args.total.toLocaleString()}</td>
            </tr>
          </table>
          ${track}
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#8a7480;">
            Keep your phone nearby — our delivery partner will call before arriving.
            Questions? Just reply to this email.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    to: "",
    subject: `Order confirmed · ${args.orderNumber} · NABILA FASHION`,
    html,
  };
}

export const dispatchOrderAlert = action({
  args: {
    orderNumber: v.string(),
    customerName: v.string(),
    phone: v.string(),
    division: v.string(),
    total: v.number(),
    itemCount: v.number(),
    customerEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const staffText = [
      "🛍️ New NABILA FASHION order",
      `Order: ${args.orderNumber}`,
      `Customer: ${args.customerName} (${args.phone})`,
      `Ship to: ${args.division}`,
      `Items: ${args.itemCount}`,
      `Total: ৳${args.total.toLocaleString()} · Cash on delivery`,
    ].join("\n");

    const result = { customerEmail: false, webhook: false, staffEmail: false };

    // 1) Customer order confirmation.
    if (args.customerEmail && args.customerEmail.includes("@")) {
      const email = confirmationEmail(args);
      try {
        result.customerEmail = await sendEmail({ ...email, to: args.customerEmail });
      } catch (error) {
        console.error("[NABILA FASHION] customer confirmation failed", error);
      }
    }

    // 2) Staff webhook.
    const webhookUrl = process.env.ORDER_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: staffText, order: args }),
        });
        result.webhook = true;
      } catch (error) {
        console.error("[NABILA FASHION] webhook alert failed", error);
      }
    }

    // 3) Staff alert email.
    const staffEmail = process.env.ORDER_ALERT_EMAIL;
    if (staffEmail) {
      try {
        result.staffEmail = await sendEmail({
          to: staffEmail,
          subject: `New order ${args.orderNumber} · ৳${args.total.toLocaleString()}`,
          html: `<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;">${staffText}</pre>`,
        });
      } catch (error) {
        console.error("[NABILA FASHION] staff alert email failed", error);
      }
    }

    if (!result.customerEmail && !result.webhook && !result.staffEmail) {
      console.log("[NABILA FASHION] order alert (in-app only)", staffText);
    }

    return result;
  },
});
