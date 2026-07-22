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

interface BannerData {
  text: string;
  bgColor?: string;
  isActive?: boolean;
}

function getInitials(name: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function roleColor(role?: string): string {
  if (role === "admin") return "bg-rose-600";
  if (role === "vendor") return "bg-emerald-600";
  return "bg-indigo-600";
}

function dashboardHref(role?: string): string {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/";
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: banner } = useQuery<BannerData>({
    queryKey: ["/api/banner"],
  });

  const updateBannerMutation = useMutation({
    mutationFn: (text: string) => apiRequest("PUT", "/api/banner", { text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banner"] });
      setEditingBanner(false);
      toast({ title: "Banner updated successfully" });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save banner changes.",
        variant: "destructive",
      });
    },
  });

  // Focus search input when search bar opens
  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Click outside and Escape key handler for popovers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function saveBanner() {
    if (bannerDraft.trim()) {
      updateBannerMutation.mutate(bannerDraft.trim());
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      setSearchOpen(false);
      navigate(`/shop?q=${encodeURIComponent(query)}`);
    } else {
      toast({
        title: "Search Error",
        description: "Please enter a search term",
        variant: "destructive",
      });
    }
  }

  async function handleLogout() {
    await logout();
    setProfileOpen(false);
    toast({ title: "Signed out", description: "See you next time!" });
    navigate("/");
  }

  const canEditBanner = user?.role === "admin" || user?.role === "vendor";
  const bannerBg = banner?.bgColor ?? "#0f172a";
  const bannerText =
    banner?.text ?? "Free shipping on all orders over $50! Use code: FREESHIP";
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
          className="text-white text-xs sm:text-sm text-center py-2 px-4 relative flex items-center justify-center gap-2 transition-colors"
          style={{ backgroundColor: bannerBg }}
        >
          {editingBanner ? (
            <div className="flex items-center gap-2 w-full max-w-xl">
              <Input
                className="h-7 text-xs sm:text-sm text-slate-900 bg-white flex-1"
                value={bannerDraft}
                onChange={(e) => setBannerDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveBanner()}
                autoFocus
              />
              <button
                onClick={saveBanner}
                className="text-white hover:text-emerald-300 transition-colors p-1"
                title="Save"
                aria-label="Save banner text"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditingBanner(false)}
                className="text-white hover:text-rose-300 transition-colors p-1"
                title="Cancel"
                aria-label="Cancel banner editing"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <span className="font-medium tracking-wide">{bannerText}</span>
              {canEditBanner && (
                <button
                  onClick={() => {
                    setBannerDraft(banner?.text ?? "");
                    setEditingBanner(true);
                  }}
                  className="text-white/70 hover:text-white transition-colors ml-1 p-0.5"
                  title="Edit banner"
                  aria-label="Edit banner message"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Main Header ── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-slate-900 cursor-pointer">
                  Retail<span className="text-emerald-600">Trove</span>
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 text-sm font-medium">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href}>
                  <span
                    className={`cursor-pointer transition-colors ${
                      location === link.href
                        ? "text-emerald-600 font-semibold"
                        : "text-slate-700 hover:text-emerald-600"
                    }`}
                  >
                    {link.name}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Right Action Buttons */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Search Toggle Button */}
              <Button
                onClick={() => setSearchOpen(!searchOpen)}
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-slate-900 rounded-full"
                aria-label="Search site"
              >
                <SearchIcon className="h-5 w-5" />
              </Button>

              {/* Profile / Account Dropdown */}
              {user ? (
                <div className="relative hidden sm:block" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 focus:outline-none p-1 rounded-full hover:bg-slate-100 transition-colors"
                    title={user.name}
                    aria-expanded={profileOpen}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${roleColor(
                        user.role
                      )}`}
                    >
                      {getInitials(user.name)}
                    </div>
                    <span className="hidden lg:block text-sm font-medium text-slate-800 max-w-[100px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  {/* Profile Menu Popover */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email}
                        </p>
                        <span
                          className={`inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${roleColor(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </div>

                      {(user.role === "admin" || user.role === "vendor") && (
                        <Link href={dashboardHref(user.role)}>
                          <span
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <LayoutDashboardIcon className="h-4 w-4 text-slate-500" />
                            Dashboard
                          </span>
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 cursor-pointer w-full text-left"
                      >
                        <LogOutIcon className="h-4 w-4 text-rose-500" />
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
                    className="hidden sm:flex items-center gap-1.5 text-sm font-medium border-slate-200"
                  >
                    <UserIcon className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              )}

              {/* Shopping Cart Drawer Trigger */}
              <Button
                onClick={() => setCartOpen(!cartOpen)}
                variant="ghost"
                size="icon"
                className="text-slate-600 hover:text-slate-900 rounded-full relative"
                aria-label="Shopping Cart"
              >
                <ShoppingBagIcon className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </Button>

              {/* Mobile Hamburger Menu Toggle */}
              <Button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                variant="ghost"
                size="icon"
                className="md:hidden text-slate-600 hover:text-slate-900"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <XIcon className="h-6 w-6" />
                ) : (
                  <MenuIcon className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => (
              <Link key={link.name} href={link.href}>
                <span
                  className={`block px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
                    location === link.href
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-slate-800 hover:bg-slate-50"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.name}
                </span>
              </Link>
            ))}

            {user ? (
              <div className="pt-3 border-t border-slate-100 mt-2">
                <div className="flex items-center gap-3 px-3 mb-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${roleColor(
                      user.role
                    )}`}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 capitalize">
                      {user.role}
                    </p>
                  </div>
                </div>

                {(user.role === "admin" || user.role === "vendor") && (
                  <Link href={dashboardHref(user.role)}>
                    <span
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md cursor-pointer"
                    >
                      Dashboard
                    </span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-md"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/login">
                <span
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-emerald-600 hover:bg-emerald-50 rounded-md cursor-pointer"
                >
                  Sign In / Register
                </span>
              </Link>
            )}
          </div>
        )}

        {/* Collapsible Search Bar */}
        {searchOpen && (
          <div className="border-t border-slate-100 py-3 px-4 bg-slate-50/80 animate-in fade-in duration-150">
            <form className="max-w-3xl mx-auto" onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for products, categories, or brands..."
                  className="w-full bg-white border border-slate-300 rounded-md py-2 px-4 pl-10 pr-10 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </header>

      {/* Cart Drawer */}
      <CartDrawer open={cartOpen} setOpen={setCartOpen} />
    </>
  );
}
