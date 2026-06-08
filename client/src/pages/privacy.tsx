import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

export default function Privacy() {
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
            <img
              src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80"
              alt="Privacy Policy"
              className="h-full w-full object-cover opacity-30"
            />
          </div>
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">Privacy Policy</h1>
          <p className="mt-6 text-xl text-white max-w-3xl">
            Your privacy is important to us. Learn how we collect, use, and protect your personal information.
          </p>
        </div>
      </div>

      {/* Privacy Policy Content */}
      <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8">
        <div className="prose prose-lg max-w-none">
          {dbContent ? (
            <div className="space-y-6">
              {dbContent.split("\n\n").filter((p: string) => p.trim()).map((paragraph: string, i: number) => {
                // Check if it's a heading (starts with #)
                if (paragraph.trim().startsWith("#")) {
                  const level = paragraph.match(/^#+/)?.[0].length || 1;
                  const text = paragraph.replace(/^#+\s*/, "").trim();
                  if (level === 1) {
                    return <h1 key={i} className="text-3xl font-bold text-primary-900 mt-8 mb-4">{text}</h1>;
                  } else if (level === 2) {
                    return <h2 key={i} className="text-2xl font-bold text-primary-900 mt-6 mb-3">{text}</h2>;
                  } else {
                    return <h3 key={i} className="text-xl font-semibold text-primary-900 mt-4 mb-2">{text}</h3>;
                  }
                }
                return <p key={i} className="text-gray-700 whitespace-pre-line">{paragraph.trim()}</p>;
              })}
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-gray-500">Last updated: January 1, 2026</p>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">1. Information We Collect</h2>
                <p className="text-gray-700">
                  We collect information you provide directly to us, including your name, email address, shipping address, phone number, and payment information when you create an account, place an order, or subscribe to our newsletter.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">2. How We Use Your Information</h2>
                <p className="text-gray-700">
                  We use the information we collect to process and fulfill orders, communicate with you about your orders and our services, send promotional emails (if you've subscribed), improve our products and services, and prevent fraud and abuse.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">3. Information Sharing</h2>
                <p className="text-gray-700">
                  We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website, conducting our business, or servicing you, as long as those parties agree to keep this information confidential.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">4. Data Security</h2>
                <p className="text-gray-700">
                  We implement industry-standard security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">5. Cookies and Tracking</h2>
                <p className="text-gray-700">
                  We use cookies and similar tracking technologies to enhance your browsing experience, remember your preferences, analyze site traffic, and understand how our services are used. You can control cookies through your browser settings.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">6. Your Rights</h2>
                <p className="text-gray-700">
                  You have the right to access, update, or delete your personal information at any time. You can also unsubscribe from marketing emails using the unsubscribe link in any email we send you. If you have questions about your data or wish to exercise these rights, please contact us.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">7. Children's Privacy</h2>
                <p className="text-gray-700">
                  Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">8. Changes to This Policy</h2>
                <p className="text-gray-700">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-primary-900 mt-8 mb-4">9. Contact Us</h2>
                <p className="text-gray-700">
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
                  <br /><br />
                  Email: privacy@retailtrove.com<br />
                  Phone: +1 (555) 123-4567<br />
                  Address: 123 Commerce Street, New York, NY 10001, United States
                </p>
              </div>
            </div>
          )}
        </div>

        {/* CTA Section */}
        <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-primary-900 mb-4">Questions about our privacy practices?</h3>
          <p className="text-gray-700 mb-6">
            We're committed to transparency and protecting your data. Reach out if you need clarification.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/contact">
              <Button size="lg">Contact Us</Button>
            </Link>
            <Link href="/shop">
              <Button variant="outline" size="lg">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
