import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    document.title = "Terms of Service - RetailTrove";
  }, []);
  const { data: contentData } = useQuery<any>({
    queryKey: ["/api/site-content/tos"],
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
              alt="Terms & Conditions"
              eager
              width={1950}
              height={500}
              className="h-full w-full object-cover opacity-30"
            />
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Terms & Conditions
          </h1>
          <p className="mt-6 text-xl text-white max-w-3xl">
            Please read these terms carefully before using our platform.
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8">
        <div className="prose prose-lg max-w-none">
          {dbContent ? (
            <div className="space-y-6">
              {dbContent
                .split("\n\n")
                .filter((p: string) => p.trim())
                .map((paragraph: string, i: number) => {
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
                  1. Acceptance of Terms
                </h2>
                <p className="text-gray-700">
                  By accessing and using RetailTrove, you agree to be bound by these Terms and
                  Conditions and our Privacy Policy. If you do not agree, please do not use our
                  platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  2. Eligibility and Account Registration
                </h2>
                <p className="text-gray-700">
                  You must be at least 13 years old (or the applicable minimum age in your
                  jurisdiction) to use our services. You must provide accurate and complete
                  information when creating an account. You are responsible for safeguarding your
                  credentials and for all activity that occurs under your account. Notify us
                  immediately if you suspect unauthorized use.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  3. Orders and Payment
                </h2>
                <p className="text-gray-700">
                  By placing an order you represent that the information provided is accurate and
                  that you are authorized to use the chosen payment method. We reserve the right to
                  refuse or cancel orders for legitimate reasons, including pricing errors, stock
                  limitations, or suspected fraud. Order totals are verified server-side from our
                  current prices before payment is initiated, and payment state is advanced only by
                  verified payment-provider callbacks.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  4. Order Confirmation and Receipts
                </h2>
                <p className="text-gray-700">
                  When you place an order you will receive an order confirmation email, and once
                  payment succeeds a receipt is issued. For transparency, your account includes a
                  full order history showing every item purchased, the unit price and quantity of
                  each line, and the taxes applied to your order total. You may download a receipt
                  for each order from your account page at any time.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  5. Pricing, Taxes and Payment Methods
                </h2>
                <p className="text-gray-700">
                  All prices are displayed in US Dollars and include a 10% tax applied at checkout.
                  We may update prices at any time; the price shown at the moment you confirm an
                  order is the price you pay. We accept payment through our secure providers — Lemon
                  Squeezy (card-based checkout) and M-Pesa (Safaricom mobile money). Payments are
                  processed in real time and recorded with a unique reference on your receipt.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  6. Loyalty Program
                </h2>
                <p className="text-gray-700">
                  Purchases earn loyalty points (1 point per $1 of order value, rounded up) which
                  can be redeemed for store credit (100 points = $1). Points are credited after
                  successful payment and are forfeited if the order is refunded or cancelled.
                  Participation is subject to our fair-use rules; we may adjust or terminate the
                  program with notice.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  7. Shipping and Delivery
                </h2>
                <p className="text-gray-700">
                  Shipping times are estimates and may vary based on your location and product
                  availability. Once your order ships you will receive a shipping-status email, and
                  the current status is always visible in your order history. We are not responsible
                  for delays caused by shipping carriers, customs processing, or events beyond our
                  control.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  8. Returns, Refunds and Cancellations
                </h2>
                <p className="text-gray-700">
                  You may return most physical items within 30 days of delivery for a full refund,
                  provided they are unused and in original packaging. Digital products and
                  personalized items are non-refundable. Refunds are processed to the original
                  payment method within 5–10 business days of approval. If a payment fails or is
                  refunded, product stock is automatically restored to our inventory.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  9. Intellectual Property
                </h2>
                <p className="text-gray-700">
                  All content on this platform, including text, graphics, logos, images, and
                  software, is the property of RetailTrove or its content suppliers and is protected
                  by applicable intellectual property laws. You may not copy, reproduce, or
                  redistribute this content without our prior written consent.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  10. User Conduct and Prohibited Activities
                </h2>
                <p className="text-gray-700">
                  You agree not to misuse the platform: you may not attempt to gain unauthorized
                  access to accounts or systems, interfere with or overload the service, submit
                  fraudulent orders or payments, scrape data at scale, or otherwise violate the
                  security or integrity of the platform. We take fraud and abuse seriously and may
                  suspend accounts engaged in such activity.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  11. Acceptable Use and Security
                </h2>
                <p className="text-gray-700">
                  Our platform employs industry-standard security controls, including rate limiting
                  and abuse monitoring. You agree not to circumvent these controls or attempt to
                  probe, bypass, or defeat any security measure. You are responsible for keeping
                  your login credentials confidential.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  12. Disclaimers and Limitation of Liability
                </h2>
                <p className="text-gray-700">
                  Our platform and products are provided "as is" and "as available" without
                  warranties of any kind, express or implied, to the maximum extent permitted by
                  law. To the fullest extent permitted by applicable law, RetailTrove shall not be
                  liable for any indirect, incidental, special, consequential, or punitive damages
                  arising from your use of, or inability to use, the platform or products. Nothing
                  in these terms limits liability that cannot be limited by law.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  13. Indemnification
                </h2>
                <p className="text-gray-700">
                  You agree to indemnify and hold harmless RetailTrove and its officers, employees,
                  and agents from and against any claims, damages, liabilities, and expenses arising
                  out of your use of the platform, your violation of these Terms, or your violation
                  of any rights of a third party.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">14. Termination</h2>
                <p className="text-gray-700">
                  We may suspend or terminate your access to the platform at any time for breach of
                  these Terms, fraudulent or abusive behavior, or as required by law. You may close
                  your account at any time. Termination does not affect rights and obligations that
                  accrued before termination.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  15. Governing Law and Disputes
                </h2>
                <p className="text-gray-700">
                  These Terms are governed by the laws of the State of New York, United States,
                  without regard to its conflict-of-law principles. Any disputes arising from these
                  Terms or your use of the platform will be resolved through the courts of New York,
                  subject to any mandatory consumer-protection provisions in your jurisdiction.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  16. Changes to Terms
                </h2>
                <p className="text-gray-700">
                  We may update these Terms from time to time. Changes take effect when posted on
                  this page, and the "Last updated" date above reflects the latest revision. Your
                  continued use of the platform after changes are posted constitutes acceptance of
                  the updated terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">17. Contact Us</h2>
                <p className="text-gray-700">
                  If you have any questions about these Terms and Conditions, please contact us at:
                  <br />
                  <br />
                  Email: legal@retailtrove.com
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
          <h3 className="text-2xl font-bold text-primary-900 mb-4">Questions about our terms?</h3>
          <p className="text-gray-700 mb-6">
            We're committed to transparency. Reach out if you need clarification on any of our
            policies.
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
