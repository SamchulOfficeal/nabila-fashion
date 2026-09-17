import type { Doc } from "@/convex/_generated/dataModel";

type InvoiceStore = {
  storeName: string;
  logoUrl: string;
  supportPhone: string;
};

type InvoiceOrder = Pick<
  Doc<"orders">,
  | "orderNumber"
  | "createdAt"
  | "customerName"
  | "phone"
  | "address"
  | "district"
  | "division"
  | "items"
  | "subtotal"
  | "deliveryCharge"
  | "discount"
  | "total"
  | "paymentMethod"
  | "paymentStatus"
  | "status"
  | "couponCode"
  | "courierName"
  | "consignmentCode"
>;

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"]/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;",
  );

const taka = (amount: number) => `৳${Number(amount ?? 0).toLocaleString("en-BD")}`;

/**
 * Opens a print-ready A4 invoice for the order. Uses the browser's own
 * "Save as PDF" destination — zero bundle cost, crisp vector text, and works
 * on every device without an PDF runtime dependency.
 */
export function printInvoice(order: InvoiceOrder, store: InvoiceStore) {
  const placed = new Date(order.createdAt).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const rows = order.items
    .map(
      (item, index) => `
      <tr>
        <td class="c">${index + 1}</td>
        <td>${esc(item.name)}${item.size ? `<span class="muted"> · Size ${esc(item.size)}</span>` : ""}${item.color ? `<span class="muted"> · ${esc(item.color)}</span>` : ""}</td>
        <td class="c">${item.quantity}</td>
        <td class="r">${taka(item.price)}</td>
        <td class="r">${taka(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(order.orderNumber)} · ${esc(store.storeName)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; padding: 36px; font-family: Georgia, 'Times New Roman', serif; color: #2b1722; background: #fff; }
  .sheet { max-width: 760px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 3px solid #9d174d; padding-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { width: 52px; height: 52px; border-radius: 14px; object-fit: cover; }
  .brand h1 { margin: 0; font-size: 20px; letter-spacing: 0.02em; }
  .brand p { margin: 2px 0 0; font-size: 10px; letter-spacing: 0.3em; color: #9d174d; text-transform: uppercase; }
  .meta { text-align: right; font-size: 12px; line-height: 1.7; color: #6b5560; }
  .meta strong { color: #2b1722; font-size: 15px; }
  .grid { display: flex; gap: 16px; margin: 22px 0; }
  .card { flex: 1; border: 1px solid #eee0e7; border-radius: 12px; padding: 14px 16px; font-size: 12.5px; line-height: 1.7; }
  .card h2 { margin: 0 0 6px; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #9d174d; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #8a7480; border-bottom: 1px solid #eee0e7; padding: 8px 6px; }
  td { padding: 9px 6px; border-bottom: 1px solid #f6edf2; vertical-align: top; }
  td.c, th.c { text-align: center; width: 40px; }
  td.r, th.r { text-align: right; }
  .muted { color: #8a7480; font-size: 11px; }
  .totals { margin-top: 14px; margin-left: auto; width: 300px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 2px solid #9d174d; margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 16px; color: #9d174d; }
  footer { margin-top: 30px; border-top: 1px solid #eee0e7; padding-top: 14px; font-size: 11px; color: #8a7480; line-height: 1.7; text-align: center; }
  @media print { body { padding: 0; } .sheet { max-width: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">
        ${store.logoUrl ? `<img src="${esc(store.logoUrl)}" alt="" />` : ""}
        <div>
          <h1>${esc(store.storeName)}</h1>
          <p>Invoice · Cash on delivery</p>
        </div>
      </div>
      <div class="meta">
        <strong>${esc(order.orderNumber)}</strong><br />
        Placed ${esc(placed)}<br />
        Status: ${esc(order.status)} · Payment: ${esc(order.paymentStatus)}<br />
        ${store.supportPhone ? `Support ${esc(store.supportPhone)}` : ""}
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Billed to</h2>
        ${esc(order.customerName)}<br />
        ${esc(order.phone)}<br />
        ${esc(order.address)}, ${esc(order.district)}, ${esc(order.division)}
      </div>
      <div class="card">
        <h2>Delivery</h2>
        Method: ${order.paymentMethod === "cod" ? "Cash on delivery" : esc(order.paymentMethod)}<br />
        Courier: ${esc(order.courierName || "Assigned at dispatch")}<br />
        ${order.consignmentCode ? `Consignment: <strong>${esc(order.consignmentCode)}</strong>` : "Consignment: pending pickup"}
      </div>
    </div>

    <table>
      <thead>
        <tr><th class="c">#</th><th>Item</th><th class="c">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${taka(order.subtotal)}</span></div>
      <div><span>Delivery</span><span>${taka(order.deliveryCharge)}</span></div>
      ${order.discount > 0 ? `<div><span>Discount${order.couponCode ? ` (${esc(order.couponCode)})` : ""}</span><span>−${taka(order.discount)}</span></div>` : ""}
      <div class="grand"><span>Total payable</span><span>${taka(order.total)}</span></div>
    </div>

    <footer>
      Thank you for shopping with ${esc(store.storeName)}. This invoice was generated
      electronically and is valid without a signature.
    </footer>
  </div>
  <script>window.onload = () => { setTimeout(() => window.print(), 350); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=840,height=960");
  if (!win) {
    throw new Error("The browser blocked the invoice window. Allow pop-ups and try again.");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
