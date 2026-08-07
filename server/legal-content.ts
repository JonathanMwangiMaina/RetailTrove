// Canonical legal-policy text, seeded into site_content for fresh databases.
// Mirrors migrations/0011_legal_policies.sql (which updates existing prod rows).
// The markdown format is rendered by the privacy/terms pages (## → h2, blank
// line → paragraph).

export const PRIVACY_POLICY_CONTENT = `## 1. Information We Collect
We collect information you provide directly to us, including your name, email address, shipping address, phone number, and payment details when you create an account, place an order, or subscribe to our newsletter. We also collect limited technical information automatically, such as your IP address, browser type, and pages visited, to operate and improve our services.

## 2. How We Use Your Information
We use your information to process and fulfil orders, generate and deliver order receipts, communicate about orders and shipping, operate the loyalty program, prevent fraud and abuse, and — only where you have subscribed — send promotional emails. We practice data minimization: we collect and retain only what is needed for these purposes.

## 3. Legal Bases and Consent
Where required by law (including the GDPR and UK GDPR), we process personal data on the bases of contract performance (fulfilling your orders), legitimate interests (security, fraud prevention, and service improvement), legal obligation, and consent (for marketing). You may withdraw consent at any time.

## 4. Information Sharing
We do not sell, trade, or rent your personal information to third parties. We may share your information only with trusted service providers who assist us in operating our website, processing payments, delivering shipments, or servicing you, and only to the extent necessary — those parties are bound by confidentiality and data-protection obligations.

## 5. Cookies and Tracking
We use cookies and similar technologies to enhance your browsing experience, remember preferences, keep you signed in securely, and analyse site traffic. You can control or delete cookies through your browser settings; some site features may not work without them.

## 6. Data Security — Industry Best Practices
We protect your data with industry-standard measures: encryption in transit (TLS/HTTPS), strong password requirements with strength validation, salted password hashing, rate limiting and lockout controls, secure session management with session regeneration on login, Cross-Site Request Forgery (CSRF) protection, input validation and sanitization, and hardened HTTP security headers including Content Security Policy (CSP) and HSTS. Access to production data is restricted, changes are audit-logged, and database rows are protected by row-level security policies.

## 7. Payment Processing and PCI Compliance
Payments are processed by our payment providers (Lemon Squeezy and M-Pesa Safaricom). We do not store full card numbers or mobile-money credentials on our servers; payment data is transmitted directly to our PCI-DSS-compliant providers over encrypted channels. Payment callbacks are verified and processed idempotently to prevent duplicate charges.

## 8. Third-Party Service Providers
We work with a small number of specialist providers to run the store: hosting and content delivery (Vercel), database services (Supabase), email delivery (Brevo), caching (Upstash), and error monitoring (Sentry). Each provider receives only the data required for its function and is contractually required to protect it.

## 9. Order Transparency and Records
We believe in transparent commerce. In your account you can view your order history with the full itemized value of each purchase, including line-item prices, quantity, and any deductions applied, and download a receipt for every order.

## 10. Data Retention
We retain order and transaction records for as long as needed to fulfil our legal, tax, warranty, and customer-service obligations, and we delete or anonymize personal data no longer required. You may request deletion at any time.

## 11. Your Rights
Depending on your location, you may have the right to access, correct, port, or delete your personal information, to object to or restrict certain processing, and to withdraw consent. You can also unsubscribe from marketing emails using the link in any email we send you.

## 12. International Data Transfers
Our service providers may process data in regions outside your country of residence. Where personal data is transferred internationally, we rely on appropriate safeguards such as standard contractual clauses and adequacy decisions.

## 13. Children's Privacy
Our services are not intended for children under the age of 13 (or the applicable minimum age in your jurisdiction). We do not knowingly collect personal information from children and will delete any such information we become aware of.

## 14. Data Breach Notification
In the unlikely event of a data breach affecting your personal information, we will notify you and the relevant supervisory authority as required by applicable law, without undue delay, and take steps to mitigate harm.

## 15. Changes to This Policy
We may update this Privacy Policy from time to time to reflect changes in our practices or the law. We will post the new policy on this page and update the Last updated date.

## 16. Contact Us
If you have any questions about this Privacy Policy or our privacy practices, please contact us at privacy@retailtrove.com or +1 (555) 123-4567, or write to 123 Commerce Street, New York, NY 10001, United States.`;

export const TERMS_OF_SERVICE_CONTENT = `## 1. Acceptance of Terms
By accessing and using RetailTrove, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, please do not use our platform.

## 2. Eligibility and Account Registration
You must be at least 13 years old (or the applicable minimum age in your jurisdiction) to use our services. You must provide accurate and complete information when creating an account. You are responsible for safeguarding your credentials and for all activity that occurs under your account.

## 3. Orders and Payment
By placing an order you represent that the information provided is accurate and that you are authorized to use the chosen payment method. We reserve the right to refuse or cancel orders for legitimate reasons, including pricing errors, stock limitations, or suspected fraud. Order totals are verified server-side from our current prices before payment is initiated, and payment state is advanced only by verified payment-provider callbacks.

## 4. Order Confirmation and Receipts
When you place an order you will receive an order confirmation email, and once payment succeeds a receipt is issued. For transparency, your account includes a full order history showing every item purchased, the unit price and quantity of each line, and the taxes applied to your order total. You may download a receipt for each order from your account page at any time.

## 5. Pricing, Taxes and Payment Methods
All prices are displayed in US Dollars and include a 10% tax applied at checkout. We may update prices at any time; the price shown at the moment you confirm an order is the price you pay. We accept payment through our secure providers — Lemon Squeezy (card-based checkout) and M-Pesa (Safaricom mobile money). Payments are recorded with a unique reference on your receipt.

## 6. Loyalty Program
Purchases earn loyalty points (1 point per $1 of order value, rounded up) which can be redeemed for store credit (100 points = $1). Points are credited after successful payment and are forfeited if the order is refunded or cancelled. Participation is subject to our fair-use rules; we may adjust or terminate the program with notice.

## 7. Shipping and Delivery
Shipping times are estimates and may vary based on your location and product availability. Once your order ships you will receive a shipping-status email, and the current status is always visible in your order history. We are not responsible for delays caused by shipping carriers, customs processing, or events beyond our control.

## 8. Returns, Refunds and Cancellations
You may return most physical items within 30 days of delivery for a full refund, provided they are unused and in original packaging. Digital products and personalized items are non-refundable. Refunds are processed to the original payment method within 5-10 business days of approval. If a payment fails or is refunded, product stock is automatically restored to our inventory.

## 9. Intellectual Property
All content on this platform, including text, graphics, logos, images, and software, is the property of RetailTrove or its content suppliers and is protected by applicable intellectual property laws. You may not copy, reproduce, or redistribute this content without our prior written consent.

## 10. User Conduct and Prohibited Activities
You agree not to misuse the platform: you may not attempt to gain unauthorized access to accounts or systems, interfere with or overload the service, submit fraudulent orders or payments, scrape data at scale, or otherwise violate the security or integrity of the platform. We may suspend accounts engaged in such activity.

## 11. Acceptable Use and Security
Our platform employs industry-standard security controls, including rate limiting and abuse monitoring. You agree not to circumvent these controls or attempt to probe, bypass, or defeat any security measure.

## 12. Disclaimers and Limitation of Liability
Our platform and products are provided as is and as available without warranties of any kind, express or implied, to the maximum extent permitted by law. To the fullest extent permitted by law, RetailTrove shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of, or inability to use, the platform or products.

## 13. Indemnification
You agree to indemnify and hold harmless RetailTrove and its officers, employees, and agents from and against any claims, damages, liabilities, and expenses arising out of your use of the platform, your violation of these Terms, or your violation of any rights of a third party.

## 14. Termination
We may suspend or terminate your access to the platform at any time for breach of these Terms, fraudulent or abusive behavior, or as required by law. You may close your account at any time.

## 15. Governing Law and Disputes
These Terms are governed by the laws of the State of New York, United States, without regard to its conflict-of-law principles. Any disputes will be resolved through the courts of New York, subject to any mandatory consumer-protection provisions in your jurisdiction.

## 16. Changes to Terms
We may update these Terms from time to time. Changes take effect when posted on this page, and the Last updated date above reflects the latest revision. Your continued use of the platform after changes are posted constitutes acceptance of the updated terms.

## 17. Contact Us
If you have any questions about these Terms and Conditions, please contact us at legal@retailtrove.com or +1 (555) 123-4567, or write to 123 Commerce Street, New York, NY 10001, United States.`;
