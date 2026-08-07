import type { Order, OrderItem } from "../shared/schema.js";

export const TAX_RATE = 0.1;

export interface OrderLine {
  productId: number | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderBreakdown {
  lineItems: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  pointsEarned: number;
}

/**
 * Reconstructs a customer-facing order breakdown from the order row and its
 * frozen line items. The order total is the authoritative value; subtotal is
 * derived from the line-item price snapshots and tax is the residual, so the
 * receipt always reconciles with what was actually charged.
 */
export function orderBreakdown(order: Order, items: OrderItem[]): OrderBreakdown {
  const lineItems: OrderLine[] = items.map((item) => {
    const unitPrice = Number(item.price) || 0;
    const quantity = item.quantity ?? 1;
    return {
      productId: item.productId,
      productName: item.productName ?? `Product #${item.productId ?? "?"}`,
      variantName: item.variantName,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
    };
  });

  const subtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
  const total = Math.max(0, Number(order.total) || 0);
  const tax = Math.max(0, total - subtotal);
  const pointsEarned =
    order.paymentStatus === "paid" && order.userId ? Math.max(1, Math.floor(total)) : 0;

  return { lineItems, subtotal, tax, total, pointsEarned };
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function formatMoney(value: number): string {
  return `$${(Math.round(value * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "paid":
    case "shipped":
    case "delivered":
      return "background:#d1fae5;color:#065f46";
    case "processing":
      return "background:#dbeafe;color:#1e40af";
    case "pending":
      return "background:#fef3c7;color:#92400e";
    case "failed":
    case "refunded":
    case "cancelled":
      return "background:#fee2e2;color:#991b1b";
    default:
      return "background:#f3f4f6;color:#374151";
  }
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "Unknown";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Builds a self-contained, print-ready HTML receipt. Served as a downloadable
 * document so customers can keep a record and print/save to PDF.
 */
export function buildOrderReceiptHtml(order: Order, items: OrderItem[]): string {
  const breakdown = orderBreakdown(order, items);
  const customerName = [order.firstName, order.lastName].filter(Boolean).join(" ") || "Customer";
  const addressLines = [
    order.address,
    [order.apartment].filter(Boolean).join(" "),
    [order.city, order.state, order.postalCode].filter(Boolean).join(", "),
    order.country,
  ].filter(Boolean);

  const itemsRows = breakdown.lineItems
    .map(
      (line) => `
        <tr>
          <td>
            <div>${escapeHtml(line.productName)}</div>
            ${line.variantName ? `<div style="color:#6b7280;font-size:12px">${escapeHtml(line.variantName)}</div>` : ""}
          </td>
          <td class="r">${line.quantity}</td>
          <td class="r">${formatMoney(line.unitPrice)}</td>
          <td class="r">${formatMoney(line.lineTotal)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RetailTrove — Receipt #${order.id}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; background: #f3f4f6; }
  .sheet { max-width: 760px; margin: 32px auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  header { background: #1e3a8a; color: #ffffff; padding: 24px 32px; }
  header .brand { font-size: 20px; font-weight: 700; letter-spacing: .01em; }
  header .sub { margin-top: 4px; font-size: 13px; color: #bfdbfe; }
  .meta { display: flex; flex-wrap: wrap; gap: 16px 40px; padding: 20px 32px; border-bottom: 1px solid #e5e7eb; }
  .meta b { display: block; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: .05em; margin-bottom: 2px; }
  .meta span { font-size: 13px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  main { padding: 8px 32px 24px; }
  table.items { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px; }
  .items th { text-align: left; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: .05em; padding: 8px; border-bottom: 1px solid #e5e7eb; }
  .items td { padding: 10px 8px; border-bottom: 1px solid #f3f4f6; }
  .items .r { text-align: right; }
  .totals { margin: 16px 0 0 auto; width: 300px; font-size: 14px; }
  .totals > div { display: flex; justify-content: space-between; padding: 6px 8px; }
  .totals .grand { font-weight: 700; font-size: 16px; border-top: 2px solid #111827; margin-top: 6px; padding-top: 10px; }
  .notes { margin-top: 16px; padding: 12px 16px; background: #f9fafb; border-radius: 6px; font-size: 13px; color: #374151; }
  footer { padding: 20px 32px; background: #f9fafb; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; text-align: center; }
  @media print {
    body { background: #ffffff; }
    .sheet { margin: 0; border: none; border-radius: 0; max-width: none; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div class="brand">RetailTrove</div>
      <div class="sub">Order Receipt</div>
    </header>

    <div class="meta">
      <div><b>Receipt</b><span>#${order.id}</span></div>
      <div><b>Date</b><span>${formatDate(order.createdAt)}</span></div>
      <div><b>Payment</b><span class="badge" style="${statusBadgeClass(order.paymentStatus)}">${statusLabel(order.paymentStatus)}</span></div>
      <div><b>Fulfilment</b><span class="badge" style="${statusBadgeClass(order.shippingStatus)}">${statusLabel(order.shippingStatus)}</span></div>
    </div>

    <main>
      <div class="meta" style="border:none;padding:0;">
        <div><b>Bill To</b><span>${escapeHtml(customerName)}<br />${escapeHtml(order.email ?? "")}${order.phone ? `<br />${escapeHtml(order.phone)}` : ""}</span></div>
        ${addressLines.length ? `<div><b>Ship To</b><span>${addressLines.map((l) => escapeHtml(l)).join("<br />")}</span></div>` : ""}
        ${order.mpesaReceiptNumber ? `<div><b>M-Pesa Receipt</b><span>${escapeHtml(order.mpesaReceiptNumber)}</span></div>` : ""}
      </div>

      <table class="items">
        <thead>
          <tr>
            <th>Item</th>
            <th class="r">Qty</th>
            <th class="r">Unit Price</th>
            <th class="r">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows || '<tr><td colspan="4" style="color:#6b7280">No line items recorded for this order.</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        <div><span>Subtotal</span><span>${formatMoney(breakdown.subtotal)}</span></div>
        <div><span>Tax (${Math.round(TAX_RATE * 100)}%)</span><span>${formatMoney(breakdown.tax)}</span></div>
        <div class="grand"><span>Total</span><span>${formatMoney(breakdown.total)}</span></div>
      </div>

      ${
        breakdown.pointsEarned > 0
          ? `<div class="notes"><strong>Loyalty points earned:</strong> ${breakdown.pointsEarned} points were credited to your account for this purchase.</div>`
          : ""
      }

      <div class="notes">
        Thank you for shopping with RetailTrove. This receipt is a record of your transaction;
        for returns or questions about this order please contact support and quote receipt #${order.id}.
      </div>
    </main>

    <footer>
      RetailTrove &middot; 123 Commerce Street, New York, NY 10001 &middot; support@retailtrove.com<br />
      Prices include applicable tax. This document was generated on ${formatDate(new Date().toISOString())}.
    </footer>
  </div>
</body>
</html>`;
}
