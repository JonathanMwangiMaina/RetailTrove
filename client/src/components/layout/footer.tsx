import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FacebookIcon, InstagramIcon, TwitterIcon, LinkedinIcon, YoutubeIcon } from "lucide-react";

export default function Footer() {
  const { data: settings = [] } = useQuery<any[]>({ queryKey: ["/api/site-settings"] });
  const { data: footerAboutData } = useQuery<any>({
    queryKey: ["/api/site-content/footer_about"],
    retry: false,
  });

  const getSetting = (key: string) => (settings as any[]).find(s => s.key === key)?.value ?? "";
  const footerAbout = footerAboutData?.content ?? "Your one-stop shop for premium products with exceptional quality and design.";

  const socials = [
    { key: "facebook_url", icon: FacebookIcon, label: "Facebook" },
    { key: "instagram_url", icon: InstagramIcon, label: "Instagram" },
    { key: "twitter_url", icon: TwitterIcon, label: "Twitter" },
    { key: "linkedin_url", icon: LinkedinIcon, label: "LinkedIn" },
    { key: "youtube_url", icon: YoutubeIcon, label: "YouTube" },
  ].filter(s => getSetting(s.key));

  return (
    <footer className="bg-primary-900 text-white">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">
              Modern<span className="text-accent-500">Retail</span>
            </h3>
            <p className="text-primary-300 text-sm">{footerAbout}</p>
            {socials.length > 0 && (
              <div className="mt-4 flex space-x-4">
                {socials.map(({ key, icon: Icon, label }) => (
                  <a key={key} href={getSetting(key)} target="_blank" rel="noopener noreferrer" className="text-primary-300 hover:text-white">
                    <span className="sr-only">{label}</span>
                    <Icon className="h-6 w-6" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-4">Shop</h3>
            <ul className="space-y-3">
              <li><a className="text-primary-300 hover:text-white text-sm" href="/shop" target="_blank" rel="noopener noreferrer">All Products</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/shop?category=New%20Arrivals" target="_blank" rel="noopener noreferrer">New Arrivals</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/shop?featured=true" target="_blank" rel="noopener noreferrer">Featured</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/shop?sale=true" target="_blank" rel="noopener noreferrer">Sales &amp; Discounts</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-4">About</h3>
            <ul className="space-y-3">
              <li><a className="text-primary-300 hover:text-white text-sm" href="/about" target="_blank" rel="noopener noreferrer">Our Story</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/faq" target="_blank" rel="noopener noreferrer">FAQ</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/contact" target="_blank" rel="noopener noreferrer">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-base mb-4">Customer Service</h3>
            <ul className="space-y-3">
              <li><a className="text-primary-300 hover:text-white text-sm" href="/contact" target="_blank" rel="noopener noreferrer">Contact Us</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/faq" target="_blank" rel="noopener noreferrer">FAQ</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/faq" target="_blank" rel="noopener noreferrer">Shipping &amp; Returns</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><a className="text-primary-300 hover:text-white text-sm" href="/faq" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-300 text-sm">© {new Date().getFullYear()} ModernRetail. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
              <path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z" fill="#0E4595"/>
              <path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#FFF"/>
              <path d="M15 19h2v-9h-2v9zm-5.8-9L6.6 15c-.3.7-.6 1.3-.9 1.5H9.2L13 10h-3.8zm21.5 9h2l-5-9h-1.6l-5 9h1.8l1.1-2.3h5.6l1.1 2.3zm-4.7-3.7l2.3-4.9 2.3 4.9h-4.6z" fill="#0E4595"/>
            </svg>
            <svg viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" className="h-8 w-auto">
              <path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.4 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.4-3-3-3z" fill="#000"/>
              <path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#FFF"/>
              <circle cx="15" cy="12" r="5" fill="#EB001B"/>
              <circle cx="23" cy="12" r="5" fill="#F79E1B"/>
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}
