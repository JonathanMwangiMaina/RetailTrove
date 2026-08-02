const BOT_UA =
  /googlebot|bingbot|yandex|baidu|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|applebot/i;

const SITE_URL = "https://retailtrove.vercel.app";

const ROUTE_META: Record<string, { title: string; description: string; image?: string }> = {
  "/": {
    title: "RetailTrove - Your Online Shopping Destination",
    description:
      "Shop the latest fashion, electronics, beauty products, and more at RetailTrove. Quality products with secure checkout and fast delivery.",
  },
  "/shop": {
    title: "Shop All Products - RetailTrove",
    description:
      "Browse our complete collection of fashion, electronics, beauty products, and home essentials at RetailTrove.",
  },
  "/about": {
    title: "About Us - RetailTrove",
    description:
      "Learn about RetailTrove's mission to bring you quality products with exceptional service.",
  },
  "/contact": {
    title: "Contact Us - RetailTrove",
    description:
      "Get in touch with the RetailTrove team. We're here to help with orders, returns, and inquiries.",
  },
  "/faq": {
    title: "FAQ - RetailTrove",
    description:
      "Frequently asked questions about shopping, shipping, returns, and account management at RetailTrove.",
  },
  "/privacy": {
    title: "Privacy Policy - RetailTrove",
    description:
      "RetailTrove's privacy policy. Learn how we collect, use, and protect your personal information.",
  },
  "/terms": {
    title: "Terms of Service - RetailTrove",
    description:
      "Read the terms and conditions for using the RetailTrove platform and placing orders.",
  },
  "/login": {
    title: "Sign In - RetailTrove",
    description:
      "Sign in to your RetailTrove account to manage orders, track shipments, and save your favorites.",
  },
};

function renderHTML(route: string, meta: { title: string; description: string; image?: string }) {
  const url = `${SITE_URL}${route}`;
  const image = meta.image || `${SITE_URL}/og-default.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="${url}"/>
  <meta property="og:title" content="${meta.title}"/>
  <meta property="og:description" content="${meta.description}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:site_name" content="RetailTrove"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${meta.title}"/>
  <meta name="twitter:description" content="${meta.description}"/>
  <meta name="twitter:image" content="${image}"/>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
}

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  const ua = request.headers.get("user-agent") || "";
  const isBot = BOT_UA.test(ua);

  // Non-bots get the real SPA shell. The built index.html is served as a static
  // file (Vercel resolves the filesystem before rewrites), so fetching it here
  // cannot recurse into this edge function. A 307 to request.url would loop.
  if (!isBot) {
    const res = await fetch(`${SITE_URL}/index.html`);
    if (res.ok) {
      return new Response(await res.text(), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    // Last-resort fallback — at least provide the document shell.
    return new Response(renderHTML("/", ROUTE_META["/"]), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const { pathname } = new URL(request.url);

  // Exact static routes
  const meta = ROUTE_META[pathname];
  if (meta) {
    return new Response(renderHTML(pathname, meta), {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Dynamic product routes — serve base HTML, let client render
  const productMatch = pathname.match(/^\/product\/(\d+)$/);
  if (productMatch) {
    return new Response(
      renderHTML(pathname, {
        title: "Product - RetailTrove",
        description:
          "View this product on RetailTrove. Quality products with secure checkout and fast delivery.",
      }),
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  // Category routes
  const categoryMatch = pathname.match(/^\/shop\/([^/]+)$/);
  if (categoryMatch) {
    const category = decodeURIComponent(categoryMatch[1]);
    return new Response(
      renderHTML(pathname, {
        title: `${category} - RetailTrove`,
        description: `Shop ${category} products at RetailTrove. Browse our curated selection.`,
      }),
      {
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  // Fallback: serve the base app shell for unknown routes (never self-redirect).
  return new Response(renderHTML(pathname, ROUTE_META["/"]), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
