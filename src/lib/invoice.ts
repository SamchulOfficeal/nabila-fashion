import type { Doc } from "@/convex/_generated/dataModel";

type InvoiceStore = {
  storeName: string;
  logoUrl: string;
  supportPhone: string;
  supportEmail?: string;
  storeAddress?: string;
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
> & { paymentReference?: string | null };

const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"]/g, (ch) =>
    ch === "&" ? "&amp;" : ch === "<" ? "&lt;" : ch === ">" ? "&gt;" : "&quot;",
  );

const taka = (amount: number) => `৳${Number(amount ?? 0).toLocaleString("en-BD")}`;

/** Issue 4: canonical display names for payment methods (cod | bkash | nagad | online). */
export function paymentMethodLabel(method: string | null | undefined): string {
  switch (method) {
    case "bkash":
      return "bKash";
    case "nagad":
      return "Nagad";
    case "online":
      return "Online payment";
    case "cod":
      return "Cash on Delivery";
    default:
      return method ? esc(method) : "Cash on Delivery";
  }
}

/**
 * Opens a print-ready A4 invoice for the order. Uses the browser's own
 * "Save as PDF" destination — zero bundle cost, crisp vector text.
 */
export function printInvoice(order: InvoiceOrder, store: InvoiceStore) {
  const placed = new Date(order.createdAt).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const invoiceNo = order.orderNumber.replace(/^#/, "");
  const method = paymentMethodLabel(order.paymentMethod);

  const rows = order.items
    .map(
      (item, index) => `
      <tr class="${index % 2 === 1 ? "alt" : ""}">
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
<title>Invoice ${esc(invoiceNo)} · ${esc(store.storeName)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12.5px; color: #2b1722; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1, h2, .brand h1 { font-family: Georgia, 'Times New Roman', serif; }
  .sheet { max-width: 780px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; border-bottom: 3px solid #9d174d; padding-bottom: 18px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand img { width: 56px; height: 56px; border-radius: 14px; object-fit: cover; }
  .brand h1 { margin: 0; font-size: 22px; letter-spacing: 0.02em; }
  .brand .sub { margin: 3px 0 0; font-size: 10px; letter-spacing: 0.3em; color: #9d174d; text-transform: uppercase; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .meta { text-align: right; font-size: 12px; line-height: 1.75; color: #6b5560; }
  .meta table { border-collapse: collapse; margin-left: auto; }
  .meta td { padding: 1px 0 1px 14px; }
  .meta td.k { text-align: right; color: #8a7480; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.14em; }
  .meta td.v { text-align: left; font-weight: 600; color: #2b1722; }
  .grid { display: flex; gap: 16px; margin: 22px 0; }
  .card { flex: 1; border: 1px solid #eee0e7; border-radius: 12px; padding: 14px 16px; font-size: 12.5px; line-height: 1.7; }
  .card h2 { margin: 0 0 6px; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #9d174d; }
  .card .muted { color: #8a7480; }
  table.items { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  table.items th { text-align: left; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #8a7480; background: #fdf5f8; border-top: 1px solid #eee0e7; border-bottom: 1px solid #e5cdd8; padding: 8px 8px; }
  table.items td { padding: 9px 8px; border-bottom: 1px solid #f6edf2; vertical-align: top; }
  table.items tr.alt td { background: #fdfafb; }
  td.c, th.c { text-align: center; width: 40px; }
  td.r, th.r { text-align: right; }
  .muted { color: #8a7480; font-size: 11px; }
  .totals { margin-top: 16px; margin-left: auto; width: 310px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 2px solid #9d174d; margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 16px; color: #9d174d; }
  .payline { margin-top: 14px; padding: 10px 14px; border: 1px dashed #e5cdd8; border-radius: 10px; font-size: 12px; color: #6b5560; }
  .payline strong { color: #2b1722; }
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
          <p class="sub">Invoice</p>
        </div>
      </div>
      <div class="meta">
        <table>
          <tr><td class="k">Invoice no</td><td class="v">${esc(invoiceNo)}</td></tr>
          <tr><td class="k">Invoice date</td><td class="v">${esc(new Date().toLocaleDateString("en-BD", { dateStyle: "medium" }))}</td></tr>
          <tr><td class="k">Order no</td><td class="v">${esc(order.orderNumber)}</td></tr>
          <tr><td class="k">Order date</td><td class="v">${esc(placed)}</td></tr>
          <tr><td class="k">Status</td><td class="v">${esc(order.status)} · ${esc(order.paymentStatus)}</td></tr>
        </table>
      </div>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Bill To</h2>
        ${esc(order.customerName)}<br />
        ${esc(order.phone)}<br />
        <span class="muted">Billing: account on file</span>
      </div>
      <div class="card">
        <h2>Ship To</h2>
        ${esc(order.customerName)}<br />
        ${esc(order.phone)}<br />
        ${esc(order.address)}, ${esc(order.district)}, ${esc(order.division)}
      </div>
    </div>

    <table class="items">
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

    <div class="payline">
      Payment method: <strong>${method}</strong> · Status: <strong>${esc(order.paymentStatus)}</strong>
      ${order.paymentReference ? `<br />Transaction / sender ref: <strong>${esc(order.paymentReference)}</strong>` : ""}
      ${order.courierName || order.consignmentCode ? `<br />Courier: <strong>${esc(order.courierName || "Pending")}</strong>${order.consignmentCode ? ` · Consignment: <strong>${esc(order.consignmentCode)}</strong>` : ""}` : ""}
    </div>

    <footer>
      Thank you for shopping with ${esc(store.storeName)}.
      ${store.supportPhone || store.supportEmail ? `Questions? ${store.supportPhone ? `Call ${esc(store.supportPhone)}` : ""}${store.supportPhone && store.supportEmail ? " · " : ""}${store.supportEmail ? `email ${esc(store.supportEmail)}` : ""}.` : ""}
      This invoice was generated electronically and is valid without a signature.
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
