export const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: "",
  originalPrice: "",
  imageUrl: "",
  category: "",
  subcategory: "",
  badge: "",
  featured: false,
  newArrival: false,
  inStock: true,
  stockQuantity: 0,
};

export const CONTENT_LABELS: Record<string, string> = {
  about: "About Page",
  contact: "Contact Page",
  footer_about: "Footer — About Text",
  tos: "Terms of Service",
  privacy: "Privacy Policy",
};

export const SOCIAL_FIELDS = [
  { key: "facebook_url", label: "Facebook URL", placeholder: "https://facebook.com/yourpage" },
  { key: "twitter_url", label: "Twitter / X URL", placeholder: "https://twitter.com/yourhandle" },
  { key: "instagram_url", label: "Instagram URL", placeholder: "https://instagram.com/yourhandle" },
  {
    key: "linkedin_url",
    label: "LinkedIn URL",
    placeholder: "https://linkedin.com/company/yourcompany",
  },
  { key: "youtube_url", label: "YouTube URL", placeholder: "https://youtube.com/@yourchannel" },
];

export function discountPct(price: string, originalPrice?: string | null) {
  const p = parseFloat(price);
  const op = parseFloat(originalPrice ?? "0");
  if (!op || op <= p) return null;
  return Math.round(((op - p) / op) * 100);
}

export function timeAgo(date: string | Date) {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function roleColor(role: string) {
  if (role === "admin") return "bg-red-600";
  if (role === "vendor") return "bg-emerald-600";
  return "bg-blue-600";
}
