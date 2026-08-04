import nodemailer from "nodemailer";
import type { Order, OrderItem } from "../shared/schema.js";
import { storage } from "./storage.js";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    const smtpUser = process.env.SMTP_USER || process.env.SMTP_LOGIN;
    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_KEY;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: smtpUser ? { user: smtpUser, pass: smtpPass || "" } : undefined,
    });
  }
  return transporter;
}

const FROM_ADDRESS = process.env.SMTP_FROM || "RetailTrove <noreply@retailtrove.com>";

export async function sendWelcomeEmail(email: string): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: "Welcome to RetailTrove Newsletter!",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to RetailTrove</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                          Welcome to RetailTrove!
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px;">
                          Thank you for subscribing!
                        </h2>
                        <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                          We're thrilled to have you join our community of savvy shoppers. You're now on the inside track for:
                        </p>
                        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #4b5563; font-size: 16px; line-height: 1.8;">
                          <li>Exclusive early access to new product launches</li>
                          <li>Special subscriber-only discounts and promotions</li>
                          <li>Monthly curated collections and style guides</li>
                          <li>Behind-the-scenes updates and company news</li>
                        </ul>
                        <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td style="background-color: #f59e0b; border-radius: 6px; text-align: center;">
                              <a href="https://retailtrove.vercel.app/shop" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                Start Shopping Now
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Keep an eye on your inbox for our first newsletter coming your way soon!
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                          RetailTrove - Your premium shopping destination
                        </p>
                        <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                          123 Commerce Street, New York, NY 10001
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                          You received this email because you subscribed to our newsletter.
                          <br>
                          <a href="mailto:support@retailtrove.com" style="color: #3b82f6; text-decoration: none;">Unsubscribe</a> |
                          <a href="https://retailtrove.vercel.app/privacy" style="color: #3b82f6; text-decoration: none;">Privacy Policy</a>
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
    console.log(`Welcome email sent to: ${email}`);
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

export async function sendNewsletterEmail(
  subscribers: string[],
  subject: string,
  content: string,
): Promise<void> {
  try {
    const batchSize = 50;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);
      await Promise.all(
        batch.map((email) =>
          getTransporter().sendMail({
            from: FROM_ADDRESS,
            to: email,
            subject,
            html: content,
          }),
        ),
      );
    }
    console.log(`Newsletter sent to ${subscribers.length} subscribers`);
  } catch (error) {
    console.error("Failed to send newsletter:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  try {
    await getTransporter().sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: "Reset Your Password — RetailTrove",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                          Password Reset Request
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                          We received a request to reset the password for your RetailTrove account.
                        </p>
                        <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                          Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td style="background-color: #1e40af; border-radius: 6px; text-align: center;">
                              <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                Reset My Password
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                        <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.6;">
                          If the button doesn't work, copy and paste this URL into your browser:<br>
                          <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                          RetailTrove - Your premium shopping destination
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
    console.log(`Password reset email sent to: ${email}`);
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
}

/* ============================================================================
 * Transactional Email Helpers
 * ============================================================================ */

function emailShell(title: string, bodyHtml: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">${title}</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">${bodyHtml}</td>
                </tr>
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                      RetailTrove - Your premium shopping destination
                    </p>
                    <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 12px;">
                      Need help? <a href="mailto:support@retailtrove.com" style="color: #3b82f6; text-decoration: none;">Contact us</a> |
                      <a href="https://retailtrove.vercel.app/privacy" style="color: #3b82f6; text-decoration: none;">Privacy Policy</a>
                    </p>
                    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                      You received this email because you placed an order with RetailTrove.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function orderItemsTable(items: OrderItem[]): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${item.productName ?? `Product #${item.productId}`}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center;">${item.quantity ?? 1}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px; text-align: right;">$${Number(item.price ?? 0).toFixed(2)}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <th style="padding: 10px 0; border-bottom: 2px solid #059669; color: #065f46; font-size: 12px; text-transform: uppercase; text-align: left;">Item</th>
        <th style="padding: 10px 0; border-bottom: 2px solid #059669; color: #065f46; font-size: 12px; text-transform: uppercase; text-align: center;">Qty</th>
        <th style="padding: 10px 0; border-bottom: 2px solid #059669; color: #065f46; font-size: 12px; text-transform: uppercase; text-align: right;">Price</th>
      </tr>
      ${rows}
    </table>
  `;
}

function shippingAddressHtml(order: Order): string {
  return `
    <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">
      ${order.firstName ?? ""} ${order.lastName ?? ""}
    </p>
    <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">
      ${order.address ?? ""}${order.apartment ? `, ${order.apartment}` : ""}
    </p>
    <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">
      ${order.city ?? ""}${order.state ? `, ${order.state}` : ""} ${order.postalCode ?? ""}
    </p>
    <p style="margin: 0 0 4px 0; color: #374151; font-size: 14px;">${order.country ?? ""}</p>
  `;
}

/**
 * Transactional order-email scenarios. Each maps to a distinct copy block.
 * `pending` is intentionally NOT a scenario — it is a no-op.
 */
export type OrderEmailScenario =
  "payment_success" | "payment_failed" | "processing" | "shipped" | "delivered" | "cancelled";

const SCENARIO_COPY: Record<
  OrderEmailScenario,
  {
    title: string;
    subject: string;
    intro: string;
    ctaText?: string;
    ctaColor: string;
    showShippingAddress: boolean;
  }
> = {
  payment_success: {
    title: "Thank You for Your Order!",
    subject: "Order Confirmed",
    intro: "your order has been confirmed. A receipt is below.",
    ctaText: "View Your Order",
    ctaColor: "#059669",
    showShippingAddress: true,
  },
  payment_failed: {
    title: "Payment Failed",
    subject: "Payment Failed",
    intro:
      "unfortunately your payment for this order could not be processed. No charge was made and your items have been returned to stock.",
    ctaText: "Try Again",
    ctaColor: "#dc2626",
    showShippingAddress: false,
  },
  processing: {
    title: "Your Order Is Being Processed",
    subject: "Your Order Is Being Processed",
    intro: "your payment went through and our team is now preparing your items for shipment.",
    ctaText: "View Your Order",
    ctaColor: "#059669",
    showShippingAddress: false,
  },
  shipped: {
    title: "Your Order Has Shipped!",
    subject: "Your Order Has Shipped!",
    intro: "great news — your order is on its way! Use the button below to track its progress.",
    ctaText: "Track Your Order",
    ctaColor: "#059669",
    showShippingAddress: false,
  },
  delivered: {
    title: "Your Order Has Been Delivered",
    subject: "Your Order Has Been Delivered",
    intro:
      "your order has arrived. We hope you love everything — thank you for shopping with RetailTrove!",
    ctaText: "View Your Order",
    ctaColor: "#059669",
    showShippingAddress: false,
  },
  cancelled: {
    title: "Your Order Was Cancelled",
    subject: "Your Order Was Cancelled",
    intro:
      "your order has been cancelled. If this is unexpected, please reach out to our support team.",
    ctaText: "View Your Order",
    ctaColor: "#dc2626",
    showShippingAddress: false,
  },
};

const SHIPPING_STATUS_SCENARIO: Record<string, OrderEmailScenario> = {
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

/**
 * Resolve the recipient email for an order: prefer the address captured at
 * checkout, fall back to the registered user's email (by auth UUID).
 */
export async function resolveOrderEmail(order: Order): Promise<string | null> {
  if (order.email) return order.email;
  if (!order.userId) return null;
  const user = await storage.getUserByAuthUserId(order.userId);
  return user?.email ?? null;
}

/**
 * Send a transactional email for an order using the copy for the given
 * scenario. Skips silently when no recipient can be resolved.
 */
export async function sendOrderStatusEmail(
  order: Order,
  items: OrderItem[],
  scenario: OrderEmailScenario,
): Promise<void> {
  const email = await resolveOrderEmail(order);
  if (!email) {
    console.warn(`[Email] Order #${order.id} has no customer email — skipping ${scenario}`);
    return;
  }

  const copy = SCENARIO_COPY[scenario];
  const orderIdLabel = `#RT${String(order.id).padStart(4, "0")}`;
  const orderUrl = `${process.env.APP_URL ?? "https://retailtrove.vercel.app"}/order-confirmation?id=${order.id}`;
  const placedOn = order.createdAt
    ? new Date(order.createdAt).toLocaleString()
    : new Date().toLocaleString();

  const shippingBlock = copy.showShippingAddress
    ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; background-color: #f9fafb; border-radius: 6px; padding: 16px;">
            <tr>
              <td>
                <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 13px; font-weight: 600; text-transform: uppercase;">Shipping Address</p>
                ${shippingAddressHtml(order)}
              </td>
            </tr>
          </table>
        `
    : "";

  const footerNote =
    scenario === "payment_failed"
      ? "No charge was made. You can try again from the order page at any time."
      : "You'll receive another email when your order ships. Thanks for shopping with RetailTrove!";

  const contactLine =
    scenario === "payment_failed"
      ? ""
      : ` Questions about your order? <a href="mailto:support@retailtrove.com" style="color: #3b82f6;">Contact support</a>.`;

  try {
    await getTransporter().sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: `${copy.subject} — ${orderIdLabel} | RetailTrove`,
      html: emailShell(
        copy.title,
        `
          <p style="margin: 0 0 16px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
            Hi ${order.firstName ?? "there"}, ${copy.intro}
          </p>
          <p style="margin: 0 0 4px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
            Order ${orderIdLabel}
          </p>
          <p style="margin: 0 0 20px 0; color: #9ca3af; font-size: 13px;">
            Placed on ${placedOn}
          </p>
          ${shippingBlock}
          ${orderItemsTable(items)}
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 8px 0 0 0;">
            <tr>
              <td style="padding: 8px 0; color: #374151; font-size: 14px; font-weight: 600;">Total (incl. tax)</td>
              <td style="padding: 8px 0; color: #059669; font-size: 16px; font-weight: 700; text-align: right;">$${Number(order.total ?? 0).toFixed(2)}</td>
            </tr>
          </table>
          ${
            copy.ctaText
              ? `
          <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
            <tr>
              <td style="background-color: ${copy.ctaColor}; border-radius: 6px; text-align: center;">
                <a href="${orderUrl}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ${copy.ctaText}
                </a>
              </td>
            </tr>
          </table>
          `
              : ""
          }
          <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
            ${footerNote}${contactLine}
          </p>
        `,
      ),
    });
    console.log(`[Email] ${scenario} email sent for order #${order.id} to ${email}`);
  } catch (error) {
    console.error(`[Email] Failed to send ${scenario} email for order #${order.id}:`, error);
  }
}

export async function sendOrderConfirmationEmail(order: Order, items: OrderItem[]): Promise<void> {
  await sendOrderStatusEmail(order, items, "payment_success");
}

export async function sendShippingStatusEmail(
  order: Order,
  items: OrderItem[],
  status: string,
): Promise<void> {
  const scenario = SHIPPING_STATUS_SCENARIO[status];
  if (!scenario) {
    console.warn(`[Email] Order #${order.id} — no email for shipping status "${status}" (no-op)`);
    return;
  }
  await sendOrderStatusEmail(order, items, scenario);
}
