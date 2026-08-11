import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCurrency } from "@/hooks/use-currency";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Product as ProductType,
  ProductVariant,
  ProductImage,
  ProductReviewSummary,
  ProductReview,
} from "@shared/schema";
import { StarIcon, CheckIcon, GlobeIcon, HeartIcon } from "lucide-react";

interface ProductWithVariants extends ProductType {
  variants?: ProductVariant[];
  images?: ProductImage[];
  reviewSummary?: ProductReviewSummary;
}

type ReviewWithAuthor = ProductReview & { userName?: string | null };

interface MyReviewResponse {
  hasPurchased: boolean;
  review: ProductReview | null;
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(undefined);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  // Fetch product data
  const {
    data: product,
    isLoading,
    error,
  } = useQuery<ProductWithVariants>({
    queryKey: [`/api/products/${id}`],
  });

  const { data: reviews = [] } = useQuery<ReviewWithAuthor[]>({
    queryKey: [`/api/products/${id}/reviews`],
    enabled: !!id,
  });

  const { data: myReview } = useQuery<MyReviewResponse>({
    queryKey: [`/api/products/${id}/reviews/me`],
    enabled: !!user,
  });

  const submitReviewMutation = useMutation({
    mutationFn: (payload: { rating: number; title: string; comment: string }) =>
      apiRequest("POST", `/api/products/${id}/reviews`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}/reviews`] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}/reviews/me`] });
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      toast({ title: "Review published", description: "Thanks for your feedback!" });
    },
    onError: (e: Error) =>
      toast({ title: "Failed to submit review", description: e.message, variant: "destructive" }),
  });

  const variants = product?.variants ?? [];
  const galleryImages = product?.images ?? [];
  const reviewSummary = product?.reviewSummary;
  const averageRating = reviewSummary?.averageRating ?? 0;
  const reviewCount = reviewSummary?.reviewCount ?? 0;

  // Effective selection: an explicit user choice wins, otherwise fall back to
  // the default in-stock option. Derived at render time (no effect, no
  // cascading setState) so the page always has a valid selection.
  const effectiveVariantId =
    selectedVariantId ??
    variants.find((v) => v.isDefault && v.isActive && v.stockQuantity > 0)?.id ??
    variants.find((v) => v.isActive && v.stockQuantity > 0)?.id ??
    variants[0]?.id;
  const selectedVariant = variants.find((v) => v.id === effectiveVariantId);

  const selectVariant = (variantId: number) => {
    setSelectedVariantId(variantId);
    setSelectedImage(0);
  };

  useEffect(() => {
    document.title = product ? `${product.name} - RetailTrove` : "Product - RetailTrove";
  }, [product]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Loading skeleton for product images */}
          <div className="lg:max-w-lg lg:self-end">
            <Skeleton className="rounded-lg w-full h-96 mb-4" />
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-20 rounded-md" />
              ))}
            </div>
          </div>

          {/* Loading skeleton for product info */}
          <div className="mt-10 lg:mt-0 lg:max-w-lg lg:self-start">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-8 w-24 mb-6" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-3/4 mb-6" />
            <Skeleton className="h-10 w-full mb-4" />
            <Skeleton className="h-6 w-40 mb-4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-2xl font-bold text-primary-900 mb-4">Product Not Found</h2>
        <p className="text-gray-500 mb-6">We couldn't find the product you were looking for.</p>
        <Link href="/shop">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  // Real gallery images from the DB. The hero is the variant's own image when
  // a variant is selected, otherwise the product's primary image. Thumbnails
  // always lead with the current hero so a variant swap re-renders cleanly.
  const variantImage = selectedVariant?.imageUrl;
  const galleryUrls = galleryImages.map((img) => img.url);
  const thumbnails = variantImage
    ? [variantImage, ...galleryUrls]
    : galleryUrls.length > 0
      ? [product.imageUrl, ...galleryUrls]
      : [product.imageUrl];
  const activeImage = thumbnails[selectedImage] ?? thumbnails[0];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: thumbnails,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    brand: {
      "@type": "Brand",
      name: "RetailTrove",
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating,
            reviewCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
          {/* Product Images */}
          <div className="lg:max-w-lg lg:self-end">
            <div className="rounded-lg overflow-hidden mb-4">
              <OptimizedImage
                src={activeImage}
                alt={product.name}
                width={512}
                height={384}
                eager
                sizes="(min-width: 1024px) 512px, 100vw"
                className="w-full h-96 object-cover"
              />
            </div>
            {thumbnails.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {thumbnails.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImage(index)}
                    className={`rounded-md overflow-hidden border-2 ${
                      selectedImage === index ? "border-secondary-500" : "border-gray-200"
                    }`}
                  >
                    <OptimizedImage
                      src={image}
                      alt={`${product.name} - View ${index + 1}`}
                      width={80}
                      height={80}
                      sizes="80px"
                      className="w-full h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="mt-10 lg:mt-0 lg:max-w-lg lg:self-start">
            <div className="flex items-center">
              <a href="#reviews" className="flex items-center">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(averageRating) ? "text-yellow-400" : "text-gray-300"
                      }`}
                      fill="currentColor"
                    />
                  ))}
                </div>
                <p className="ml-2 text-sm text-gray-500 hover:text-gray-700">
                  {reviewCount > 0
                    ? `${averageRating.toFixed(1)} out of 5 · ${reviewCount} ${
                        reviewCount === 1 ? "review" : "reviews"
                      }`
                    : "No reviews yet"}
                </p>
              </a>
            </div>

            <div className="mt-6">
              <h1 className="text-3xl font-bold text-primary-900">{product.name}</h1>
              <h2 className="sr-only">Product information</h2>
              <div className="mt-2 flex items-center">
                <p className="text-3xl text-primary-900">
                  {formatPrice(Number(selectedVariant?.price ?? product.price))}
                </p>
                {product.originalPrice && !selectedVariant && (
                  <p className="ml-2 text-lg text-gray-500 line-through">
                    {formatPrice(Number(product.originalPrice))}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-primary-900">Description</h3>
              <div className="mt-2 text-base text-gray-500 space-y-4">
                <p>{product.description}</p>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-primary-900">Options</h3>
                  <span className="text-sm text-gray-500">
                    {selectedVariant ? selectedVariant.name : "Select an option"}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {variants.map((variant) => {
                    const isSelected = variant.id === effectiveVariantId;
                    const isUnavailable = !variant.isActive || variant.stockQuantity < 1;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => {
                          if (!isUnavailable) selectVariant(variant.id);
                        }}
                        disabled={isUnavailable}
                        aria-pressed={isSelected}
                        className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
                          isUnavailable
                            ? "border-gray-100 text-gray-300 line-through cursor-not-allowed"
                            : isSelected
                              ? "border-secondary-500 bg-secondary-50 text-secondary-700"
                              : "border-gray-200 text-gray-700 hover:border-gray-400"
                        }`}
                      >
                        {variant.name}
                        {isUnavailable && <span className="sr-only"> (unavailable)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col space-y-4">
              <Button
                onClick={() =>
                  addToCart(product, {
                    variantId: effectiveVariantId,
                    variant: selectedVariant,
                  })
                }
                disabled={variants.length > 0 && !selectedVariant}
                size="lg"
                className="w-full bg-secondary-600 hover:bg-secondary-700 text-white"
              >
                Add to cart
              </Button>
              <Button
                variant="outline"
                onClick={() => toggle(product)}
                aria-pressed={isWishlisted(product.id)}
                aria-label={
                  isWishlisted(product.id)
                    ? `Remove ${product.name} from wishlist`
                    : `Add ${product.name} to wishlist`
                }
                className={`flex items-center justify-center ${
                  isWishlisted(product.id)
                    ? "text-rose-600 hover:text-rose-700 border-rose-200 bg-rose-50"
                    : "text-secondary-600 hover:text-secondary-500"
                }`}
              >
                <HeartIcon
                  className={`h-5 w-5 mr-2 ${isWishlisted(product.id) ? "fill-current" : ""}`}
                />
                {isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
              </Button>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-8">
              <div className="flex items-center">
                <CheckIcon className="h-5 w-5 text-green-500" />
                <p className="ml-2 text-sm text-gray-500">In stock and ready to ship</p>
              </div>
              <div className="mt-4 flex items-center">
                <GlobeIcon className="h-5 w-5 text-gray-400" />
                <p className="ml-2 text-sm text-gray-500">Free shipping worldwide</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <section id="reviews" aria-label="Product reviews" className="mt-16 max-w-3xl scroll-mt-24">
          <h2 className="text-2xl font-bold text-primary-900">Customer Reviews</h2>

          {reviewCount > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.round(averageRating) ? "text-yellow-400" : "text-gray-300"
                    }`}
                    fill="currentColor"
                  />
                ))}
              </div>
              <p className="text-sm text-gray-500">
                {averageRating.toFixed(1)} out of 5 ({reviewCount}{" "}
                {reviewCount === 1 ? "review" : "reviews"})
              </p>
            </div>
          )}

          <ul role="list" className="mt-6 divide-y divide-gray-200">
            {reviews.length === 0 ? (
              <li className="py-4 text-sm text-gray-500">
                No reviews yet. Be the first to review this product.
              </li>
            ) : (
              reviews.map((review) => (
                <li key={review.id} className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary-900">
                        {review.userName ?? "Anonymous"}
                      </p>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Verified purchase
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating ? "text-yellow-400" : "text-gray-300"
                          }`}
                          fill="currentColor"
                        />
                      ))}
                    </div>
                  </div>
                  {review.title && (
                    <p className="mt-2 text-sm font-semibold text-primary-900">{review.title}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">{review.comment}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    {review.createdAt
                      ? new Date(review.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                </li>
              ))
            )}
          </ul>

          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-semibold text-primary-900">Write a Review</h3>
            {!user ? (
              <p className="mt-3 text-sm text-gray-500">
                <Link
                  href="/login"
                  className="font-medium text-secondary-600 hover:text-secondary-500"
                >
                  Sign in
                </Link>{" "}
                to review this product.
              </p>
            ) : myReview && !myReview.hasPurchased ? (
              <p className="mt-3 text-sm text-gray-500">
                You can review this product after purchasing it.
              </p>
            ) : (
              <form
                className="mt-4 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reviewComment.trim().length < 10) {
                    toast({
                      title: "Review too short",
                      description: "Please write at least 10 characters.",
                      variant: "destructive",
                    });
                    return;
                  }
                  submitReviewMutation.mutate({
                    rating: reviewRating,
                    title: reviewTitle,
                    comment: reviewComment,
                  });
                }}
              >
                <div>
                  <Label>Rating</Label>
                  <div className="mt-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(i + 1)}
                        aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
                        className="p-0.5"
                      >
                        <StarIcon
                          className={`h-6 w-6 ${
                            i < reviewRating ? "text-yellow-400" : "text-gray-300"
                          }`}
                          fill="currentColor"
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="review-title">Title (optional)</Label>
                  <Input
                    id="review-title"
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    maxLength={120}
                    placeholder="Summarize your experience"
                  />
                </div>
                <div>
                  <Label htmlFor="review-comment">Review</Label>
                  <Textarea
                    id="review-comment"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="What did you like or dislike about this product?"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitReviewMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {submitReviewMutation.isPending
                    ? "Publishing..."
                    : myReview?.review
                      ? "Update review"
                      : "Publish review"}
                </Button>
                {myReview?.review && (
                  <p className="text-xs text-gray-400">
                    You have already reviewed this product — resubmitting updates it.
                  </p>
                )}
              </form>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
