import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ProductCard } from "@/components/ui/product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/currencies";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product } from "@shared/schema";
import { SearchIcon, FilterIcon, Star, X } from "lucide-react";

interface FilterSidebarProps {
  filterCategory: string;
  priceRange: [number, number];
  minRating: number;
  inStockOnly: boolean;
  hasActiveFilters: boolean;
  onCategoryChange: (category: string) => void;
  onPriceRangeChange: (range: [number, number]) => void;
  onMinRatingChange: (rating: number) => void;
  onInStockChange: (inStock: boolean) => void;
  onClearAll: () => void;
}

const CATEGORIES = [
  "All Products",
  "New Arrivals",
  "Accessories",
  "Baby",
  "Bags",
  "Beauty & Personal Care",
  "Clothing",
  "Electronics",
  "Footwear",
  "Grocery",
  "Home & Kitchen",
  "Home & Living",
  "Jewelry",
  "Sporting Goods",
];

const MIN_PRICE = 9.99;
const MAX_PRICE = 4000;

function FilterSidebar({
  filterCategory,
  priceRange,
  minRating,
  inStockOnly,
  hasActiveFilters,
  onCategoryChange,
  onPriceRangeChange,
  onMinRatingChange,
  onInStockChange,
  onClearAll,
}: FilterSidebarProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-primary-900">Filters</h3>
        <FilterIcon className="h-5 w-5 text-gray-400" />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mb-3 text-xs text-muted-foreground"
          onClick={onClearAll}
        >
          <X className="h-3 w-3 mr-1" />
          Clear all filters
        </Button>
      )}

      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Categories</h4>
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center">
              <Button
                variant="ghost"
                className={`w-full justify-start px-2 ${
                  filterCategory === category ? "text-secondary-600 font-medium" : "text-gray-500"
                }`}
                onClick={() => onCategoryChange(category)}
              >
                {category}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          Price Range
          <span className="text-muted-foreground font-normal ml-1">
            {formatPrice(priceRange[0], "USD")} – {formatPrice(priceRange[1], "USD")}
          </span>
        </h4>
        <Slider
          value={priceRange}
          onValueChange={(v: [number, number]) => onPriceRangeChange(v)}
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={1}
          className="w-full"
        />
      </div>

      <div className="border-t border-gray-200 pt-4 mb-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Minimum Rating</h4>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onMinRatingChange(r)}
              className={`p-1 rounded ${minRating === r ? "bg-yellow-100" : "hover:bg-gray-100"}`}
            >
              <Star
                className={`h-5 w-5 ${r > 0 && minRating >= r ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
              />
            </button>
          ))}
          {minRating > 0 && (
            <span className="text-xs text-muted-foreground self-center ml-1">+ {minRating}</span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">In Stock Only</h4>
          <Switch checked={inStockOnly} onCheckedChange={onInStockChange} />
        </div>
      </div>
    </div>
  );
}

interface ShopProps {
  params?: {
    category?: string;
  };
}

export default function Shop({ params }: ShopProps) {
  useEffect(() => {
    document.title = params?.category ? `${params.category} - RetailTrove` : "Shop - RetailTrove";
  }, [params?.category]);
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("featured");
  const [filterCategory, setFilterCategory] = useState(params?.category || "All Products");
  const [priceRange, setPriceRange] = useState<[number, number]>([MIN_PRICE, MAX_PRICE]);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get("q");
    if (q) setSearchQuery(q);
    const category = urlParams.get("category");
    if (category) setFilterCategory(category);
    const mp = urlParams.get("minPrice");
    const xp = urlParams.get("maxPrice");
    if (mp || xp) {
      const clamp = (v: number) => Math.min(Math.max(v, MIN_PRICE), MAX_PRICE);
      const min = mp ? clamp(Number(mp) || MIN_PRICE) : MIN_PRICE;
      const max = xp ? clamp(Number(xp) || MAX_PRICE) : MAX_PRICE;
      setPriceRange([Math.min(min, max), Math.max(min, max)]);
    }
    const mr = urlParams.get("minRating");
    if (mr) setMinRating(parseFloat(mr));
    const ins = urlParams.get("inStock");
    if (ins === "true") setInStockOnly(true);
  }, [location]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("q", searchQuery);
  if (filterCategory !== "All Products") queryParams.set("category", filterCategory);
  if (priceRange[0] > MIN_PRICE) queryParams.set("minPrice", String(priceRange[0]));
  if (priceRange[1] < MAX_PRICE) queryParams.set("maxPrice", String(priceRange[1]));
  if (minRating > 0) queryParams.set("minRating", String(minRating));
  if (inStockOnly) queryParams.set("inStock", "true");
  const queryString = queryParams.toString();
  const queryKey = `/api/products${queryString ? `?${queryString}` : ""}`;

  const { data: productsResponse, isLoading } = useQuery<
    { data: Product[]; nextCursor: number | null; total: number } | Product[]
  >({
    queryKey: [queryKey],
  });

  const products: Product[] = Array.isArray(productsResponse)
    ? productsResponse
    : ((productsResponse as { data: Product[] })?.data ?? []);

  const filteredAndSortedProducts = products
    ? [...products].sort((a, b) => {
        switch (sortOrder) {
          case "price-low":
            return Number(a.price) - Number(b.price);
          case "price-high":
            return Number(b.price) - Number(a.price);
          case "name-asc":
            return a.name.localeCompare(b.name);
          case "name-desc":
            return b.name.localeCompare(a.name);
          default:
            return a.featured ? -1 : 1;
        }
      })
    : [];

  const productCount =
    productsResponse && !Array.isArray(productsResponse)
      ? ((productsResponse as { total?: number }).total ?? filteredAndSortedProducts.length)
      : filteredAndSortedProducts.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("q", searchQuery);
    window.history.pushState({}, "", url.toString());
  };

  const handleCategoryChange = (category: string) => {
    setFilterCategory(category);
    const url = new URL(window.location.href);
    url.pathname = `/shop/${category === "All Products" ? "" : category}`;
    window.history.pushState({}, "", url.toString());
  };

  const clearAllFilters = () => {
    setPriceRange([MIN_PRICE, MAX_PRICE]);
    setMinRating(0);
    setInStockOnly(false);
    setFilterCategory("All Products");
    setSearchQuery("");
  };

  const hasActiveFilters =
    priceRange[0] > MIN_PRICE || priceRange[1] < MAX_PRICE || minRating > 0 || inStockOnly;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">
            {filterCategory === "All Products" ? "All Products" : filterCategory}
          </h1>
          <p className="text-gray-500 mt-1">
            {productCount} product
            {productCount !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <Button type="submit" className="sr-only">
              Search
            </Button>
          </form>

          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name-asc">Name: A to Z</SelectItem>
              <SelectItem value="name-desc">Name: Z to A</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="md:hidden"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="md:hidden mb-6">
          <FilterSidebar
            filterCategory={filterCategory}
            priceRange={priceRange}
            minRating={minRating}
            inStockOnly={inStockOnly}
            hasActiveFilters={hasActiveFilters}
            onCategoryChange={handleCategoryChange}
            onPriceRangeChange={setPriceRange}
            onMinRatingChange={setMinRating}
            onInStockChange={setInStockOnly}
            onClearAll={clearAllFilters}
          />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex-shrink-0 hidden md:block">
          <div className="sticky top-24">
            <FilterSidebar
              filterCategory={filterCategory}
              priceRange={priceRange}
              minRating={minRating}
              inStockOnly={inStockOnly}
              hasActiveFilters={hasActiveFilters}
              onCategoryChange={handleCategoryChange}
              onPriceRangeChange={setPriceRange}
              onMinRatingChange={setMinRating}
              onInStockChange={setInStockOnly}
              onClearAll={clearAllFilters}
            />
          </div>
        </div>

        <div className="flex-1">
          {isLoading ? (
            <div className="product-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden p-4"
                >
                  <Skeleton className="h-64 w-full rounded-md" />
                  <Skeleton className="h-4 w-20 mt-4" />
                  <Skeleton className="h-6 w-40 mt-2" />
                  <div className="flex justify-between mt-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-gray-500">Try adjusting your filters or search criteria</p>
              {hasActiveFilters && (
                <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="product-grid">
              {filteredAndSortedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
