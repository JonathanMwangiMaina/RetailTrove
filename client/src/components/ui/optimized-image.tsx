import { useState } from "react";
import { buildSrcSet, isOptimizableImage, optimizedImageUrl, RESPONSIVE_WIDTHS } from "@/lib/image";

type ImageState = "optimized" | "original" | "hidden";

export interface OptimizedImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "loading"
> {
  src: string;
  alt: string;
  sizes?: string;
  widths?: number[];
  quality?: number;
  eager?: boolean;
  hiddenOnError?: boolean;
}

/**
 * Responsive, CDN-optimized image. Proxies remote raster images through
 * `/api/image` (WebP/AVIF + sharp resize), emits a `srcSet`/`sizes` pair, and
 * lazy-loads by default. If the proxy fails it falls back to the original URL;
 * if that also fails and `hiddenOnError` is set, the element is removed.
 */
export function OptimizedImage({
  src,
  alt,
  sizes = "100vw",
  widths = RESPONSIVE_WIDTHS,
  quality,
  eager = false,
  hiddenOnError = false,
  ...rest
}: OptimizedImageProps) {
  const [state, setState] = useState<ImageState>("optimized");
  const [trackedSrc, setTrackedSrc] = useState(src);

  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setState("optimized");
  }

  const effectiveState = isOptimizableImage(src) ? state : "original";
  if (effectiveState === "hidden") return null;

  const srcSet = effectiveState === "optimized" ? buildSrcSet(src, { q: quality, widths }) : "";

  const handleError = () => {
    if (effectiveState === "optimized") setState("original");
    else if (effectiveState === "original" && hiddenOnError) setState("hidden");
  };

  return (
    <img
      src={
        effectiveState === "optimized" ? optimizedImageUrl(src, quality ? { q: quality } : {}) : src
      }
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "auto"}
      onError={handleError}
      {...rest}
    />
  );
}
