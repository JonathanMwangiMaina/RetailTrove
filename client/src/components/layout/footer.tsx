import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedinIcon,
  YoutubeIcon,
  ShieldCheck,
} from "lucide-react";

interface SiteSetting {
  key: string;
  value: string;
}

interface SiteContent {
  content: string;
}

export default function Footer() {
  const { data: settings = [] } = useQuery<SiteSetting[]>({
    queryKey: ["/api/site-settings"],
  });

  const { data: footerAboutData } = useQuery<SiteContent>({
    queryKey: ["/api/site-content/footer_about"],
    retry: false,
  });

  const getSetting = (key: string) =>
    settings.find((s) => s.key === key)?.value ?? "";

  const footerAbout =
    footerAboutData?.content ??
    "Your one-stop shop for premium products with exceptional quality, fast delivery, and secure payments.";

  const socials = [
    { key: "facebook_url", icon: FacebookIcon, label: "Facebook" },
    { key: "instagram_url", icon: InstagramIcon, label: "Instagram" },
    { key: "twitter_url", icon: TwitterIcon, label: "Twitter" },
    { key: "linkedin_url", icon: LinkedinIcon, label: "LinkedIn" },
    { key: "youtube_url", icon: YoutubeIcon, label: "YouTube" },
  ].filter((s) => getSetting(s.key));

  return (
    <footer className="bg-slate-900 text-slate-200 border-t border-slate-800">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Main Footer Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-xl tracking-tight">
              Retail<span className="text-emerald-500">Trove</span>
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {footerAbout}
            </p>

            {socials.length > 0 && (
              <div className="flex space-x-3 pt-2">
                {socials.map(({ key, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={getSetting(key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Shop Category Links */}
          <div>
            <h4 className="text-white font-semibold text-base mb-4">Shop</h4>
            <nav className="flex flex-col space-y-2.5">
              <Link
                href="/shop"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                All Products
              </Link>
              <Link
                href="/shop?category=New%20Arrivals"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                New Arrivals
              </Link>
              <Link
                href="/shop?featured=true"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Featured Collections
              </Link>
              <Link
                href="/shop?sale=true"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Sales & Discounts
              </Link>
            </nav>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-white font-semibold text-base mb-4">Company</h4>
            <nav className="flex flex-col space-y-2.5">
              <Link
                href="/about"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Contact Us
              </Link>
              <Link
                href="/faq"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Frequently Asked Questions
              </Link>
            </nav>
          </div>

          {/* Support & Legal Links */}
          <div>
            <h4 className="text-white font-semibold text-base mb-4">
              Customer Support
            </h4>
            <nav className="flex flex-col space-y-2.5">
              <Link
                href="/faq"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Shipping & Returns
              </Link>
              <Link
                href="/privacy"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/faq"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Terms & Conditions
              </Link>
            </nav>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="border-t border-slate-800 mt-10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2 text-slate-400 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Guaranteed 256-bit Encrypted & Secure Checkout</span>
            </div>

            {/* Accepted Payment Provider Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {/* Lemon Squeezy */}
              <div
                className="h-7 px-2.5 bg-slate-800 border border-slate-700 rounded flex items-center justify-center"
                title="Lemon Squeezy"
              >
                <img
                  src="https://cdn.prod.website-files.com/6347244ba8d63489ba51c08e/6a30261d7c3d5620431187e0_ls-logo-stripe-company.svg"
                  alt="Lemon Squeezy"
                  className="h-4 w-auto object-contain"
                  loading="lazy"
                />
              </div>

              {/* Visa */}
              <div
                className="h-7 px-2 bg-slate-800 border border-slate-700 rounded flex items-center justify-center"
                title="Visa"
              >
                <svg
                  viewBox="0 0 38 24"
                  className="h-4 w-auto"
                  aria-label="Visa"
                >
                  <path
                    d="M15 19h2v-9h-2v9zm-5.8-9L6.6 15c-.3.7-.6 1.3-.9 1.5H9.2L13 10h-3.8zm21.5 9h2l-5-9h-1.6l-5 9h1.8l1.1-2.3h5.6l1.1 2.3zm-4.7-3.7l2.3-4.9 2.3 4.9h-4.6z"
                    fill="#1A1F71"
                  />
                  <path
                    d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z"
                    fill="none"
                  />
                </svg>
                <span className="text-xs font-bold text-white tracking-wider ml-1">
                  VISA
                </span>
              </div>

              {/* Mastercard */}
              <div
                className="h-7 px-2 bg-slate-800 border border-slate-700 rounded flex items-center justify-center space-x-1"
                title="Mastercard"
              >
                <svg
                  viewBox="0 0 38 24"
                  className="h-4 w-auto"
                  aria-label="Mastercard"
                >
                  <circle cx="15" cy="12" r="6" fill="#EB001B" />
                  <circle cx="23" cy="12" r="6" fill="#F79E1B" fillOpacity="0.8" />
                </svg>
                <span className="text-[10px] font-semibold text-slate-200">
                  Mastercard
                </span>
              </div>

              {/* Safaricom */}
              <div
                className="h-7 px-2.5 bg-white border border-slate-700 rounded flex items-center justify-center"
                title="Safaricom"
              >
                <img
                  src="data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 130' width='400' height='130'%3E%3Cpath fill='%20e11c2a' d='M146 52.3c-23 0-51 9-77 23.3C38 92.5 18.2 110.6 20 119c1.5 7.1 18.2 8.7 42.4 4.5 13.8-2.4 28.3-7.3 42-13.8-7.8 2-15.6 3.1-22.7 3.1-23.8 0-33.8-7.8-30.8-18 3.5-12 25.1-26.8 54-37C118 53 133.5 50 146 50c-2.4 1.2-2.3 2.1 0 2.3z'/%3E%3Cpath fill='%23e11c2a' d='M145.8 50.1c-12.5 0-28 3-41.1 7.8-28.9 10.2-50.5 25-54 37-3 10.2 7 18 30.8 18 7.1 0 14.9-1.1 22.7-3.1 1.7-.8 2.5-1.7 1.8-2.6-11.4 3-22 4.1-29.8 3.1-15.2-2-20.2-8.5-17.1-17.2 3.8-10.7 24.8-24.1 52.8-33.6 13.6-4.6 27.5-7.3 38.2-7.3 12 0 16.8 3 14 8.2-3 5.8-19.1 14.3-42.3 22.3-1.6.6-2 1.5-.8 1.9 22.5-7.3 39.8-15.8 43.6-22.9 3.8-7.1-2.2-11.6-18.9-11.6z'/%3E%3Cg fill='%2328a745'%3E%3Cpath d='M108 81.3c-1.3 5.5-5.9 8.7-12.5 8.7-8 0-13-5.2-13-13.8 0-8.9 5.8-14.1 14.8-14.1 7 0 11.2 3.4 12.1 9.3h-6.2c-.7-2.9-2.8-4.5-5.9-4.5-4.8 0-8 3.4-8 9.3 0 5.6 2.9 8.8 7.3 8.8 3.4 0 5.8-1.7 6.4-4.7H108zM113 62.8h5.7v3.9h.2c1.4-2.8 4.6-4.5 8.2-4.5 7 0 10.4 4.1 10.4 11.2v16h-6.1V74.2c0-4.3-1.8-6.6-5.4-6.6-3.8 0-6.9 2.7-6.9 7.7v14.1H113V62.8zM148.8 81.6c.9 3 3.6 4.3 7.3 4.3 3.3 0 5.8-1.2 5.8-3.3 0-1.9-1.9-2.9-5.8-3.6l-3.8-.7c-5.4-1-8.5-3.4-8.5-7.8 0-5 4.5-8.3 11.3-8.3 7 0 11 3.5 11.4 8.5h-5.8c-.3-2.4-2.4-3.8-5.6-3.8-3.2 0-5.1 1.2-5.1 3.1 0 1.7 1.6 2.6 4.8 3.2l3.8.7c5.9 1.1 9.4 3.4 9.4 8.1 0 5.6-4.6 8.8-12.1 8.8-7.7 0-12.2-3.6-12.9-9.2h5.8zM176.3 62.8h5.7v3.9h.2c1.4-2.8 4.6-4.5 8.2-4.5 7 0 10.4 4.1 10.4 11.2v16h-6.1V74.2c0-4.3-1.8-6.6-5.4-6.6-3.8 0-6.9 2.7-6.9 7.7v14.1h-6.1V62.8zM209.7 62.8h5.7v3.9h.2c1.2-2.8 4.2-4.5 7.6-4.5 1.2 0 2.2.2 3.1.5v5.7c-1.1-.4-2.2-.6-3.6-.6-3.8 0-6.9 2.6-6.9 7.8v13.8h-6.1V62.8zM228.3 56.2c0-2.1 1.7-3.8 3.8-3.8s3.8 1.7 3.8 3.8-1.7 3.8-3.8 3.8-3.8-1.7-3.8-3.8zm.8 6.6h6.1v26.6h-6.1V62.8zM242.1 76.1c0-8.1 5.9-13.9 14.2-13.9 5 0 9 2.2 11.2 6.1l-4.9 3c-1.2-2.3-3.3-3.6-6.2-3.6-4.7 0-8 3.5-8 8.4 0 5 3.3 8.4 8 8.4 3 0 5.1-1.3 6.3-3.6l4.9 3c-2.3 3.9-6.3 6.1-11.3 6.1-8.3 0-14.2-5.8-14.2-13.9zM271 76.1c0-8.2 5.9-13.9 14.1-13.9s14.1 5.7 14.1 13.9c0 8.2-5.9 13.9-14.1 13.9S271 84.3 271 76.1zm22 0c0-5-3.3-8.4-7.9-8.4-4.7 0-8 3.4-8 8.4 0 5 3.3 8.4 8 8.4 4.6 0 7.9-3.4 7.9-8.4zM303.4 62.8h5.7v3.8h.2c1.4-2.7 4.2-4.4 7.5-4.4 3.7 0 6.6 1.7 7.9 4.6h.2c1.6-2.9 4.7-4.6 8.2-4.6 6.8 0 9.8 4.1 9.8 11.1v16.1h-6.1V74.2c0-4.3-1.6-6.6-4.8-6.6-3.2 0-6 2.4-6 7.2v14.6h-6.1V74.2c0-4.3-1.6-6.6-4.8-6.6-3.3 0-6 2.4-6 7.2v14.6h-6.1V62.8z'/%3E%3C/g%3E%3C/svg%3E"
                  alt="Safaricom"
                  className="h-4 w-auto object-contain"
                  loading="lazy"
                />
              </div>

              {/* M-Pesa */}
              <div
                className="h-7 px-2.5 bg-white border border-slate-700 rounded flex items-center justify-center"
                title="M-Pesa"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg"
                  alt="M-Pesa"
                  className="h-4 w-auto object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-slate-800 mt-6 pt-6 flex flex-col sm:flex-row justify-between items-center text-slate-400 text-xs">
          <p>© {new Date().getFullYear()} RetailTrove. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">
            Engineered for speed, security, and reliability.
          </p>
        </div>
      </div>
    </footer>
  );
}
