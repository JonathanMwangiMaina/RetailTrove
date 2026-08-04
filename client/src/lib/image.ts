export const IMAGE_PROXY_PATH = "/api/image";

export const RESPONSIVE_WIDTHS = [320, 480, 640, 960, 1280, 1920];

export type ImageFit = "cover" | "contain" | "fill" | "inside" | "outside";

export interface OptimizeOptions {
  w?: number;
  q?: number;
  fit?: ImageFit;
  format?: "webp" | "avif";
  widths?: number[];
}

/**
 * True when the URL is a remote http(s) raster image worth proxying. Relative
 * URLs (including our own `/api/image` proxy URLs), data URIs, blobs, and SVGs
 * are served directly.
 */
export function isOptimizableImage(src: string): boolean {
  if (!src) return false;
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  if (src.startsWith("/")) return false;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return false;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  if (/\.svg(\?|#|$)/i.test(url.pathname)) return false;
  return true;
}

export function optimizedImageUrl(src: string, options: OptimizeOptions = {}): string {
  const params = new URLSearchParams({ url: src });
  if (options.w) params.set("w", String(Math.round(options.w)));
  if (options.q) params.set("q", String(Math.round(options.q)));
  if (options.fit) params.set("fit", options.fit);
  if (options.format) params.set("format", options.format);
  return `${IMAGE_PROXY_PATH}?${params.toString()}`;
}

/**
 * Builds an `img srcSet` from the responsive width ladder (or a single width
 * when `options.w` is provided, or a custom ladder via `options.widths`).
 */
export function buildSrcSet(src: string, options: OptimizeOptions = {}): string {
  const { widths, ...rest } = options;
  const ladder = widths ?? (rest.w ? [rest.w] : RESPONSIVE_WIDTHS);
  return ladder.map((w) => `${optimizedImageUrl(src, { ...rest, w })} ${w}w`).join(", ");
}
