import { describe, it, expect } from "vitest";
import {
  isOptimizableImage,
  optimizedImageUrl,
  buildSrcSet,
  IMAGE_PROXY_PATH,
  RESPONSIVE_WIDTHS,
} from "@/lib/image";

describe("isOptimizableImage", () => {
  it("accepts remote https raster images", () => {
    expect(isOptimizableImage("https://images.unsplash.com/photo-123?w=500&q=60")).toBe(true);
    expect(isOptimizableImage("http://cdn.example.com/photo.jpg")).toBe(true);
  });

  it("rejects data URIs, blobs, and relative URLs", () => {
    expect(isOptimizableImage("data:image/png;base64,iVBOR")).toBe(false);
    expect(isOptimizableImage("blob:https://site.com/uuid")).toBe(false);
    expect(isOptimizableImage("/logo.png")).toBe(false);
    expect(isOptimizableImage("")).toBe(false);
  });

  it("rejects SVGs and non-http protocols", () => {
    expect(isOptimizableImage("https://example.com/logo.svg")).toBe(false);
    expect(isOptimizableImage("https://example.com/logo.svg?size=2")).toBe(false);
    expect(isOptimizableImage("ftp://example.com/photo.jpg")).toBe(false);
    expect(isOptimizableImage("javascript:alert(1)")).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(isOptimizableImage("not a url")).toBe(false);
  });
});

describe("optimizedImageUrl", () => {
  it("encodes the source URL as a query param", () => {
    const out = optimizedImageUrl("https://images.unsplash.com/photo-1?a=b&c=d", { w: 400 });
    expect(out).toContain(IMAGE_PROXY_PATH);
    expect(out).toContain(
      "url=" + encodeURIComponent("https://images.unsplash.com/photo-1?a=b&c=d"),
    );
    expect(out).toContain("w=400");
  });

  it("only includes options that are set", () => {
    const out = optimizedImageUrl("https://example.com/x.jpg");
    expect(out).toBe(`${IMAGE_PROXY_PATH}?url=${encodeURIComponent("https://example.com/x.jpg")}`);
  });
});

describe("buildSrcSet", () => {
  it("emits a responsive width ladder", () => {
    const src = "https://images.unsplash.com/photo-1";
    const set = buildSrcSet(src);
    const entries = set.split(", ");
    expect(entries.length).toBe(RESPONSIVE_WIDTHS.length);
    expect(entries[0]).toBe(
      `${optimizedImageUrl(src, { w: RESPONSIVE_WIDTHS[0] })} ${RESPONSIVE_WIDTHS[0]}w`,
    );
  });

  it("uses a single width when explicitly requested", () => {
    const src = "https://images.unsplash.com/photo-1";
    const set = buildSrcSet(src, { w: 320, q: 60 });
    expect(set).toBe(`${optimizedImageUrl(src, { w: 320, q: 60 })} 320w`);
  });
});
