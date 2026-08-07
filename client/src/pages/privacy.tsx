import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy - RetailTrove";
  }, []);
  const { data: contentData } = useQuery<any>({
    queryKey: ["/api/site-content/privacy"],
    retry: false,
  });
  const dbContent: string | undefined = contentData?.content;

  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative bg-gray-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/90 to-primary-800/70 overflow-hidden">
          <div className="absolute inset-0">
            <OptimizedImage
              src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
              alt="Privacy Policy"
              eager
              width={1950}
              height={500}
              className="h-full w-full object-cover opacity-30"
            />
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-6 text-xl text-white max-w-3xl">
            Your privacy is important to us. Learn how we collect, use, and protect your personal
            information.
          </p>
        </div>
      </div>

      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8">
        <div className="prose prose-lg max-w-none">
          {dbContent ? (
            <div className="space-y-6">
              {dbContent
                .split("\n\n")
                .filter((p: string) => p.trim())
                .map((paragraph: string, i: number) => {
                  // Check if it's a heading (starts with #)
                  if (paragraph.trim().startsWith("#")) {
                    const level = paragraph.match(/^#+/)?.[0].length || 1;
                    const text = paragraph.replace(/^#+\s*/, "").trim();
                    if (level === 1) {
                      return (
                        <h1 key={i} className="text-3xl font-bold text-primary-900 mt-8 mb-4">
                          {text}
                        </h1>
                      );
                    } else if (level === 2) {
                      return (
                        <h2 key={i} className="text-2xl font-bold text-primary-900 mt-6 mb-3">
                          {text}
                        </h2>
                      );
                    } else {
                      return (
                        <h3 key={i} className="text-xl font-semibold text-primary-900 mt-4 mb-2">
                          {text}
                        </h3>
                      );
                    }
                  }
                  return (
                    <p key={i} className="text-gray-700 whitespace-pre-line">
                      {paragraph.trim()}
                    </p>
                  );
                })}
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">Last updated: August 6, 2026</p>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  1. Information We Collect
                </h2>
                <p className="text-gray-700">
                  We collect information you provide directly to us, including your name, email
                  address, shipping address, phone number, and payment details when you create an
                  account, place an order, or subscribe to our newsletter. We also collect limited
                  technical information automatically, such as your IP address, browser type, and
                  pages visited, to operate and improve our services.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  2. How We Use Your Information
                </h2>
                <p className="text-gray-700">
                  We use your information to process and fulfil orders, generate and deliver order
                  receipts, communicate about orders and shipping, operate the loyalty program,
                  prevent fraud and abuse, and — only where you have subscribed — send promotional
                  emails. We practice data minimization: we collect and retain only what is needed
                  for these purposes.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  3. Legal Bases and Consent
                </h2>
                <p className="text-gray-700">
                  Where required by law (including the GDPR and UK GDPR), we process personal data
                  on the bases of contract performance (fulfilling your orders), legitimate
                  interests (security, fraud prevention, and service improvement), legal obligation,
                  and consent (for marketing). You may withdraw consent at any time.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  4. Information Sharing
                </h2>
                <p className="text-gray-700">
                  We do not sell, trade, or rent your personal information to third parties. We may
                  share your information only with trusted service providers who assist us in
                  operating our website, processing payments, delivering shipments, or servicing
                  you, and only to the extent necessary — those parties are bound by confidentiality
                  and data-protection obligations.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  5. Cookies and Tracking
                </h2>
                <p className="text-gray-700">
                  We use cookies and similar technologies to enhance your browsing experience,
                  remember preferences, keep you signed in securely, and analyse site traffic. You
                  can control or delete cookies through your browser settings; some site features
                  may not work without them.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  6. Data Security — Industry Best Practices
                </h2>
                <p className="text-gray-700">
                  We protect your data with industry-standard measures: encryption in transit
                  (TLS/HTTPS), strong password requirements with strength validation, salted
                  password hashing, rate limiting and lockout controls against abuse, secure session
                  management with session regeneration on login, Cross-Site Request Forgery (CSRF)
                  protection, input validation and sanitization, and hardened HTTP security headers
                  including Content Security Policy (CSP) and HSTS. Access to production data is
                  restricted, changes are audit-logged, and database rows are protected by row-level
                  security policies. While no method of transmission or storage is 100% secure, we
                  continuously monitor and improve our safeguards.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  7. Payment Processing and PCI Compliance
                </h2>
                <p className="text-gray-700">
                  Payments are processed by our payment providers (Lemon Squeezy and M-Pesa
                  Safaricom). We do not store full card numbers or mobile-money credentials on our
                  servers; card and payment data is transmitted directly to our PCI-DSS-compliant
                  payment providers over encrypted channels. Payment callbacks are verified and
                  processed idempotently to prevent duplicate charges.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  8. Third-Party Service Providers
                </h2>
                <p className="text-gray-700">
                  We work with a small number of specialist providers to run the store: hosting and
                  content delivery (Vercel), database services (Supabase), email delivery (Brevo),
                  caching (Upstash), and error monitoring (Sentry). Each provider receives only the
                  data required for its function and is contractually required to protect it.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  9. Order Transparency and Records
                </h2>
                <p className="text-gray-700">
                  We believe in transparent commerce. In your account you can view your order
                  history with the full itemized value of each purchase, including line-item prices,
                  quantity, and any deductions applied, and download a receipt for every order.
                  Order confirmation and shipping-status emails provide the same transparency after
                  checkout.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  10. Data Retention
                </h2>
                <p className="text-gray-700">
                  We retain order and transaction records for as long as needed to fulfil our legal,
                  tax, warranty, and customer-service obligations, and we delete or anonymize
                  personal data no longer required. Account data is retained while your account is
                  active; you may request deletion at any time.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">11. Your Rights</h2>
                <p className="text-gray-700">
                  Depending on your location, you may have the right to access, correct, port, or
                  delete your personal information, to object to or restrict certain processing, and
                  to withdraw consent. You can also unsubscribe from marketing emails using the link
                  in any email we send. To exercise any right, contact us using the details below;
                  we will respond within applicable legal timeframes.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  12. International Data Transfers
                </h2>
                <p className="text-gray-700">
                  Our service providers may process data in regions outside your country of
                  residence. Where personal data is transferred internationally, we rely on
                  appropriate safeguards such as standard contractual clauses and adequacy
                  decisions, consistent with applicable data-protection law.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  13. Children's Privacy
                </h2>
                <p className="text-gray-700">
                  Our services are not intended for children under the age of 13 (or the applicable
                  minimum age in your jurisdiction). We do not knowingly collect personal
                  information from children. If we become aware that we have collected such
                  information, we will take steps to delete it promptly.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  14. Data Breach Notification
                </h2>
                <p className="text-gray-700">
                  In the unlikely event of a data breach affecting your personal information, we
                  will notify you and the relevant supervisory authority as required by applicable
                  law, without undue delay, and take steps to mitigate harm.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  15. Changes to This Policy
                </h2>
                <p className="text-gray-700">
                  We may update this Privacy Policy from time to time to reflect changes in our
                  practices or the law. We will post the new policy on this page and update the
                  "Last updated" date. Material changes will be communicated where we have your
                  contact details.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">16. Contact Us</h2>
                <p className="text-gray-700">
                  If you have any questions about this Privacy Policy or our privacy practices,
                  please contact us at:
                  <br />
                  <br />
                  Email: privacy@retailtrove.com
                  <br />
                  Phone: +1 (555) 123-4567
                  <br />
                  Address: 123 Commerce Street, New York, NY 10001, United States
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-primary-900 mb-4">
            Questions about our privacy practices?
          </h3>
          <p className="text-gray-700 mb-6">
            We're committed to transparency and protecting your data. Reach out if you need
            clarification.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/contact">
              <Button size="lg">Contact Us</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" size="lg">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
