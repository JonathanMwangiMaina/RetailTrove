import { useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCurrency } from "@/hooks/use-currency";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { HeartIcon, Loader2, ShoppingBagIcon, Trash2Icon } from "lucide-react";

export default function WishlistPage() {
  useEffect(() => {
    document.title = "My Wishlist - RetailTrove";
  }, []);
  const { user } = useAuth();
  const { wishlist, isLoading, remove } = useWishlist();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-primary-900">My Wishlist</h1>
          <p className="text-gray-500 mt-1">
            {wishlist.length > 0
              ? `${wishlist.length} saved ${wishlist.length === 1 ? "item" : "items"}`
              : "Save items you love for later"}
          </p>
        </div>
        <Link href="/shop">
          <Button variant="outline">Continue Shopping</Button>
        </Link>
      </div>

      {!user ? (
        <div className="text-center py-20">
          <HeartIcon className="h-16 w-16 mx-auto text-gray-300" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            Sign in to view your wishlist
          </h2>
          <p className="mt-2 text-gray-500">
            Create an account or sign in to save your favorite products.
          </p>
          <Link href="/login">
            <Button className="mt-6">Sign In</Button>
          </Link>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-lg" />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-20">
          <HeartIcon className="h-16 w-16 mx-auto text-gray-300" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">Your wishlist is empty</h2>
          <p className="mt-2 text-gray-500">
            Browse the shop and tap the heart on any product to save it here.
          </p>
          <Link href="/shop">
            <Button className="mt-6">Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlist.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden group flex flex-col"
            >
              <Link href={`/product/${product.id}`}>
                <div className="relative h-56 overflow-hidden cursor-pointer">
                  <OptimizedImage
                    src={product.imageUrl}
                    alt={product.name}
                    width={224}
                    height={224}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.badge && (
                    <div className="absolute top-2 left-2 bg-secondary-500 text-white text-xs font-semibold px-2 py-1 rounded">
                      {product.badge}
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-sm text-gray-500 mb-1">{product.category}</h3>
                <Link href={`/product/${product.id}`}>
                  <h2 className="text-lg font-medium text-primary-900 hover:text-secondary-600 transition-colors cursor-pointer">
                    {product.name}
                  </h2>
                </Link>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center">
                    <p className="text-lg font-medium text-primary-900">
                      {formatPrice(Number(product.price))}
                    </p>
                    {product.originalPrice && (
                      <p className="ml-2 text-sm text-gray-500 line-through">
                        {formatPrice(Number(product.originalPrice))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 pt-2 border-t border-gray-100">
                  <Button
                    onClick={() => addToCart(product)}
                    className="flex-1 bg-secondary-600 hover:bg-secondary-700 text-white"
                    size="sm"
                  >
                    <ShoppingBagIcon className="h-4 w-4 mr-1.5" />
                    Add to cart
                  </Button>
                  <Button
                    onClick={() => remove(product.id)}
                    variant="outline"
                    size="sm"
                    aria-label={`Remove ${product.name} from wishlist`}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center mt-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
