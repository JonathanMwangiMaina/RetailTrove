import nodemailer from "nodemailer";

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
