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

  {/* Stripe */}
  <div
    className="h-7 px-2.5 bg-[#635BFF]/10 border border-[#635BFF]/30 rounded flex items-center justify-center text-xs font-semibold text-[#8F88FF]"
    title="Stripe"
  >
    Stripe
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
      src="https://upload.wikimedia.org/wikipedia/commons/1/12/Safaricom_logo.svg"
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
