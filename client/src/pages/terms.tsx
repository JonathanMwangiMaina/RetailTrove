import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
            <img
              src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
              alt="Terms & Conditions"
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
              <p className="text-sm text-gray-500">Last updated: January 1, 2026</p>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  1. Acceptance of Terms
                </h2>
                <p className="text-gray-700">
                  By accessing and using RetailTrove, you agree to be bound by these Terms and
                  Conditions. If you do not agree to these terms, please do not use our platform.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  2. Account Registration
                </h2>
                <p className="text-gray-700">
                  You must provide accurate and complete information when creating an account. You
                  are responsible for maintaining the security of your account credentials and for
                  all activities that occur under your account.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  3. Products & Pricing
                </h2>
                <p className="text-gray-700">
                  All product descriptions, images, and prices are subject to change without notice.
                  We reserve the right to modify or discontinue any product at any time. We shall
                  not be liable to you or any third party for any modification, price change,
                  suspension, or discontinuance of a product.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  4. Orders & Payment
                </h2>
                <p className="text-gray-700">
                  By placing an order, you represent that all information provided is accurate. We
                  reserve the right to refuse or cancel any order for any reason, including
                  limitations on quantities available, pricing errors, or suspected fraud. Payment
                  is processed through our secure payment providers (Lemon Squeezy and M-Pesa).
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  5. Shipping & Delivery
                </h2>
                <p className="text-gray-700">
                  Shipping times are estimates and may vary based on your location and product
                  availability. We are not responsible for delays caused by shipping carriers,
                  customs processing, or events beyond our control.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  6. Returns & Refunds
                </h2>
                <p className="text-gray-700">
                  You may return most items within 30 days of delivery for a full refund. Items must
                  be unused and in their original packaging. Digital products and personalized items
                  are non-refundable. Refunds will be processed to the original payment method
                  within 5-10 business days.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  7. Intellectual Property
                </h2>
                <p className="text-gray-700">
                  All content on this platform, including text, graphics, logos, images, and
                  software, is the property of RetailTrove or its content suppliers and is protected
                  by applicable intellectual property laws.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  8. Limitation of Liability
                </h2>
                <p className="text-gray-700">
                  RetailTrove shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages resulting from your use of or inability to use
                  our platform or products.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">
                  9. Changes to Terms
                </h2>
                <p className="text-gray-700">
                  We reserve the right to update these Terms and Conditions at any time. Changes
                  will be effective immediately upon posting. Your continued use of the platform
                  after changes are posted constitutes acceptance of the updated terms.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">10. Contact Us</h2>
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
