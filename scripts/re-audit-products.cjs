#!/usr/bin/env node
/* Re-audit all 321 products with corrected logic:
   - Only flag actually broken images (unsplash, placeholder, empty, temp folder refs)
   - Do NOT flag working retailer images just because filename doesn't match product name
   - EastMatt/Naivas/Jumia/retailer images are considered valid even with product-code filenames
*/
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "https://retailtrove.vercel.app/api/products";
const OUTPUT = path.resolve("/mnt/wsl/RetailTrove/e2e/results/flagged-products.txt");

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreMatch(name, imageUrl, category) {
  const flags = [];
  let score = 1.0;

  const nUrl = normalize(imageUrl);
  const hostname = new URL(imageUrl).hostname;

  // Check for actually broken images
  if (!nUrl || nUrl.length < 5) {
    flags.push("empty_or_short_image_url");
    score = 0;
  } else if (imageUrl.includes("unsplash")) {
    flags.push("unsplash_placeholder");
    score -= 0.8;
  } else if (
    imageUrl.includes("placeholder") ||
    imageUrl.includes("default") ||
    imageUrl.includes("no-image")
  ) {
    flags.push("placeholder_image");
    score = 0;
  } else if (imageUrl.includes("audit-") || imageUrl.includes("seed/")) {
    flags.push("temp_folder_in_url");
    score -= 0.9;
  }

  // Retailer-hosted images are VALID even if filename is a product code
  const validHosts = [
    "bdkvujsvyttdzbiwexks.supabase.co",
    "ke.jumia.is",
    "eastmatt.com",
    "naivas.online",
    "carrefour.co.ke",
  ];

  const isRetailerImage = validHosts.some((h) => imageUrl.includes(h));

  // Only do name-token matching for non-retailer images
  if (!isRetailerImage && score > 0) {
    const nName = normalize(name);
    const nameTokens = nName.split(" ").filter((t) => t.length > 2);
    if (nameTokens.length > 0) {
      const matchCount = nameTokens.filter((t) => nUrl.includes(t)).length;
      const matchRatio = matchCount / nameTokens.length;
      if (matchRatio === 0) {
        flags.push("no_name_tokens_in_image_url");
        score -= 0.3;
      }
    }
  }

  if (score < 0) score = 0;
  return { score, flags };
}

async function fetchAllProducts() {
  const products = [];
  let cursor = undefined;
  let page = 0;
  do {
    const url = new URL(API_BASE);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString());
    const data = await res.json();
    products.push(...data.data);
    cursor = data.nextCursor;
    page++;
  } while (cursor);
  return products;
}

async function main() {
  console.log("Fetching all products from API...");
  const products = await fetchAllProducts();
  console.log(`Fetched ${products.length} products`);

  const results = [];
  for (const p of products) {
    const { score, flags } = scoreMatch(p.name, p.imageUrl, p.category);
    results.push({
      id: p.id,
      name: p.name,
      description: p.description,
      imageUrl: p.imageUrl,
      category: p.category,
      price: p.price,
      score,
      flags,
    });
  }

  const flagged = results.filter((r) => r.score < 0.7);
  const broken = results.filter(
    (r) =>
      r.flags.includes("unsplash_placeholder") ||
      r.flags.includes("placeholder_image") ||
      r.flags.includes("temp_folder_in_url") ||
      r.flags.includes("empty_or_short_image_url"),
  );

  let out = `# Flagged Products Audit — ${new Date().toISOString()}\n`;
  out += `# Total products scanned: ${results.length}\n`;
  out += `# Broken images (needs fix): ${broken.length}\n`;
  out += `# Low confidence (<0.7): ${flagged.length}\n\n`;

  if (broken.length > 0) {
    out += `## BROKEN IMAGES (must fix)\n\n`;
    for (const r of broken) {
      out += `${r.id}\t${r.category}\t${r.name}\t${r.imageUrl}\t${r.score.toFixed(2)}\t${r.flags.join(";")}\n`;
    }
    out += "\n";
  }

  if (flagged.length > 0) {
    out += `## LOW CONFIDENCE (< 0.7)\n\n`;
    for (const r of flagged) {
      out += `${r.id}\t${r.category}\t${r.name}\t${r.imageUrl}\t${r.score.toFixed(2)}\t${r.flags.join(";")}\n`;
    }
  }

  fs.writeFileSync(OUTPUT, out);
  console.log(`\nAudit complete:`);
  console.log(`  Total: ${results.length}`);
  console.log(`  Broken: ${broken.length}`);
  console.log(`  Low confidence: ${flagged.length}`);
  console.log(`  Output: ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
