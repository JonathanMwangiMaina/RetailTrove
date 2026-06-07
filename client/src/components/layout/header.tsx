import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import CartDrawer from "@/components/cart/cart-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  SearchIcon,
  ShoppingBagIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  LayoutDashboardIcon,
  UserIcon,
  PencilIcon,
  CheckIcon,
  XCircleIcon,
} from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleColor(role: string) {
  if (role === "admin") return "bg-red-600";
  if (role === "vendor") return "bg-emerald-600";
  return "bg-secondary-600";
}

export default function Header() {
  const [location, navigate] = useLocation();
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(false);
  const [bannerDraft, setBannerDraft] = useState("");
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch live banner
  const { data: banner } = useQuery<{ text: string; bgColor: string; isActive: boolean }>({
    queryKey: ["/api/banner"],
  });

  const updateBannerMutation = useMutation({
    mutationFn: (text: string) => apiRequest("PUT", "/api/banner", { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banner"] });
      setEditingBanner(false);
      toast({ title: "Banner updated" });
    },
  });

  // Close profile dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function startEditBanner() {
    setBannerDraft(banner?.text ?? "");
    setEditingBanner(true);
  }

  function saveBanner() {
    if (bannerDraft.trim()) updateBannerMutation.mutate(bannerDraft.trim());
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?q=${encodeURIComponent(searchQuery.trim())}`;
    } else {
      toast({ title: "Search Error", description: "Please enter a search term", variant: "destructive" });
    }
  }

  async function handleLogout() {
    await logout();
    setProfileOpen(false);
    toast({ title: "Signed out", description: "See you next time!" });
    navigate("/");
  }

  const canEditBanner = user?.role === "admin" || user?.role === "vendor";
  const bannerBg = banner?.bgColor ?? "#1d4ed8";
  const bannerText = banner?.text ?? "Free shipping on all orders over $50! Use code: FREESHIP";
  const bannerActive = banner?.isActive !== false;

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Shop", href: "/shop" },
    { name: "About", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <>
      {/* ── Announcement Banner ── */}
      {bannerActive && (
        <div
          className="text-white text-sm text-center py-2 px-4 relative flex items-center justify-center gap-2"
          style={{ backgroundColor: bannerBg }}
        >
          {editingBanner ? (
            <div className="flex items-center gap-2 w-full max-w-2xl">
              <Input
                className="h-7 text-sm text-black bg-white flex-1"
                value={bannerDraft}
                onChange={(e) => setBannerDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBanner()}
                autoFocus
              />
              <button
                onClick={saveBanner}
                className="text-white hover:text-green-200 transition-colors"
                title="Save"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditingBanner(false)}
                className="text-white hover:text-red-200 transition-colors"
                title="Cancel"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span>{bannerText}</span>
              {canEditBanner && (
                <button
                  onClick={startEditBanner}
                  className="text-white/70 hover:text-white transition-colors ml-1"
                  title="Edit banner"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Main Header ── */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="font-bold text-xl text-primary-900 cursor-pointer">
                  Modern<span className="text-accent-500">Retail</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-8 text-sm">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href}>
                  <span
                    className={`font-medium cursor-pointer transition-colors ${
                      location === link.href
                        ? "text-secondary-600"
                        : "text-primary-900 hover:text-secondary-600"
                    }`}
                  >
                    {link.name}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {/* Search */}
              <Button
                onClick={() => setSearchOpen(!searchOpen)}
                variant="ghost"
                size="icon"
                className="text-primary-500 hover:text-primary-900 p-1 rounded-full"
              >
                <SearchIcon className="h-5 w-5" />
                <span className="sr-only">Search</span>
              </Button>

              {/* Profile / Auth */}
              {user ? (
                <div className="relative hidden sm:block" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 focus:outline-none"
                    title={user.name}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${roleColor(user.role)}`}
                    >
                      {getInitials(user.name)}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-primary-900 max-w-[100px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${roleColor(user.role)}`}
                        >
                          {user.role}
                        </span>
                      </div>
                      {(user.role === "admin" || user.role === "vendor") && (
                        <Link href="/admin">
                          <span
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                          >
                            <LayoutDashboardIcon className="h-4 w-4" />
                            Dashboard
                          </span>
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer w-full text-left"
                      >
                        <LogOutIcon className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:flex items-center gap-1.5 text-sm font-medium"
                  >
                    <UserIcon className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Cart */}
              <Button
                onClick={() => setCartOpen(!cartOpen)}
                variant="ghost"
                size="icon"
                className="text-primary-500 hover:text-primary-900 p-1 rounded-full relative"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
                <span className="sr-only">Cart</span>
              </Button>

              {/* Mobile hamburger */}
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                size="icon"
                className="md:hidden text-primary-500 hover:text-primary-900"
              >
                {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
                <span className="sr-only">Open menu</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href}>
                  <span
                    className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
                      location === link.href
                        ? "bg-primary-50 text-secondary-600"
                        : "text-primary-900 hover:bg-primary-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.name}
                  </span>
                </Link>
              ))}
              {user ? (
                <>
                  <div className="px-3 py-2 border-t border-gray-100 mt-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${roleColor(user.role)}`}
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.role}</p>
                      </div>
                    </div>
                    {(user.role === "admin" || user.role === "vendor") && (
                      <Link href="/admin">
                        <span
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-sm text-gray-700 py-1 cursor-pointer"
                        >
                          Dashboard
                        </span>
                      </Link>
                    )}
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="text-sm text-red-600 py-1"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <Link href="/login">
                  <span
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-base font-medium text-secondary-600 cursor-pointer"
                  >
                    Sign In / Register
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Search Bar */}
        {searchOpen && (
          <div className="border-t border-gray-200 py-3 px-4">
            <form className="max-w-3xl mx-auto" onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full border border-gray-300 rounded-md py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-secondary-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </form>
          </div>
        )}
      </header>

      <CartDrawer open={cartOpen} setOpen={setCartOpen} />
    </>
  );
}
