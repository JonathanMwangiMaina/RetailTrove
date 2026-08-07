import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { imageProxyHandler, isPrivateIp } from "../image-proxy.js";

const mocks = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

function makeApp() {
  const app = express();
  app.get("/api/image", imageProxyHandler());
  return app;
}

function stubPublicDns() {
  mocks.lookup.mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  mocks.lookup.mockReset();
});

describe("isPrivateIp", () => {
  it("flags loopback, RFC1918, link-local, CGNAT, and multicast ranges", () => {
    for (const ip of [
      "0.0.0.0",
      "10.0.0.1",
      "127.0.0.1",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "100.127.255.254",
      "224.0.0.1",
      "::1",
      "fe80::1",
      "fc00::1",
      "fd12:3456::1",
      "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
  });

  it("accepts public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "104.18.4.24", "2606:4700::6810:18"]) {
      expect(isPrivateIp(ip), ip).toBe(false);
    }
  });
});

describe("GET /api/image", () => {
  it("returns 400 when url is missing", async () => {
    const res = await request(makeApp()).get("/api/image");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
  });

  it("returns 400 for invalid URLs", async () => {
    const res = await request(makeApp()).get("/api/image").query({ url: "not-a-url" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
  });

  it("returns 400 for non-http protocols", async () => {
    const res = await request(makeApp()).get("/api/image").query({ url: "file:///etc/passwd" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for SVG sources", async () => {
    stubPublicDns();
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://example.com/logo.svg" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
    expect(mocks.lookup).not.toHaveBeenCalled();
  });

  it("rejects hosts that resolve to private IPs without fetching", async () => {
    mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "http://metadata.local/creds" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resizes a remote PNG to a CDN-cached WebP", async () => {
    stubPublicDns();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(PNG_1X1, {
          status: 200,
          headers: { "content-type": "image/png", "content-length": String(PNG_1X1.length) },
        }),
      ),
    );
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://images.unsplash.com/photo-1?w=500", w: 100, q: 75 });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBe("image/webp");
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(res.body.slice(0, 4).toString("latin1")).toBe("RIFF");
  });

  it("follows and validates redirects", async () => {
    stubPublicDns();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://cdn.example.com/real.png" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(PNG_1X1, {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://images.unsplash.com/short-url" });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns 400 when the source fetch fails", async () => {
    stubPublicDns();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network error")));
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://images.unsplash.com/photo-1" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
  });

  it("returns 400 when the source is larger than the cap", async () => {
    stubPublicDns();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 200,
          headers: { "content-length": String(20 * 1024 * 1024) },
        }),
      ),
    );
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://images.unsplash.com/huge" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
  });

  it("returns 400 for undecodable payloads", async () => {
    stubPublicDns();
    const junk = Buffer.from("definitely not an image");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(junk, { status: 200, headers: { "content-length": String(junk.length) } }),
        ),
    );
    const res = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://images.unsplash.com/junk" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid image request");
  });

  it("returns an identical error body for every failure mode (no reachability oracle)", async () => {
    stubPublicDns();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network error")));
    const failing = await request(makeApp())
      .get("/api/image")
      .query({ url: "https://images.unsplash.com/photo-1" });
    const blocked = await request(makeApp())
      .get("/api/image")
      .query({ url: "http://metadata.local/creds" });
    const invalid = await request(makeApp()).get("/api/image").query({ url: "not-a-url" });
    expect(failing.status).toBe(400);
    expect(blocked.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(failing.body).toEqual(blocked.body);
    expect(blocked.body).toEqual(invalid.body);
  });
});
