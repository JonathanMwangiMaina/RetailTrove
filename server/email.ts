import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(email: string): Promise<void> {
  try {
    await resend.emails.send({
      from: 'RetailTrove <onboarding@resend.dev>', // Replace with your verified domain
      to: email,
      subject: 'Welcome to RetailTrove Newsletter! 🎉',
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
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                          Welcome to RetailTrove! 🎉
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
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

                        <!-- CTA Button -->
                        <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td style="background-color: #f59e0b; border-radius: 6px; text-align: center;">
                              <a href="https://retailtrove.vercel.app/shop" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                                Start Shopping Now →
                              </a>
                            </td>
                          </tr>
                        </table>

                        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Keep an eye on your inbox for our first newsletter coming your way soon!
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
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
    console.error('Failed to send welcome email:', error);
    // Don't throw - we don't want to fail the subscription if email fails
  }
}

export async function sendNewsletterEmail(
  subscribers: string[],
  subject: string,
  content: string
): Promise<void> {
  try {
    // Send to all subscribers in batches
    const batchSize = 50; // Resend free tier allows good batch sizes
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      await Promise.all(
        batch.map(email =>
          resend.emails.send({
            from: 'RetailTrove <onboarding@resend.dev>',
            to: email,
            subject: subject,
            html: content,
          })
        )
      );
    }
    console.log(`Newsletter sent to ${subscribers.length} subscribers`);
  } catch (error) {
    console.error('Failed to send newsletter:', error);
    throw error;
  }
}
