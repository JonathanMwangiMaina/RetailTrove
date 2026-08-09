import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE_URL = "https://eastmatt.com";
const OUTPUT = "/mnt/wsl/RetailTrove/e2e/results/eastmatt-scrape.json";

test("scrape eastmatt.com products", async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 1440, height: 900 });

  console.log("Navigating to eastmatt.com...");
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(8000);

  console.log("Page title:", await page.title());
  console.log("Page URL:", page.url());

  const html = await page.content();
  console.log("HTML length:", html.length);

  // Save full HTML for inspection
  writeFileSync("/mnt/wsl/RetailTrove/e2e/results/eastmatt-homepage.html", html);

  // Try to find products
  const products = [];

  // Look for product cards/articles
  const articles = await page
    .locator('article, .product, [class*="product"], .item, [class*="item"]')
    .all();
  console.log(`Found ${articles.length} potential product elements`);

  for (let i = 0; i < Math.min(articles.length, 20); i++) {
    const art = articles[i];
    const text = await art.innerText();
    const html = await art.innerHTML();
    console.log(`\n[${i}] ${text.slice(0, 100)}`);

    if (text.includes("$") || text.includes("KSh") || text.includes("price")) {
      products.push({
        index: i,
        text: text.slice(0, 200),
        html: html.slice(0, 500),
      });
    }
  }

  // Try search
  console.log("\n=== Trying search ===");
  const searchInput = await page
    .locator('input[type="search"], input[name="q"], input[placeholder*="search" i]')
    .first();
  if ((await searchInput.count()) > 0) {
    await searchInput.fill("oil");
    await searchInput.press("Enter");
    await page.waitForTimeout(3000);

    const searchHtml = await page.content();
    writeFileSync("/mnt/wsl/RetailTrove/e2e/results/eastmatt-search.html", searchHtml);
    console.log("Search results saved");
  } else {
    console.log("No search input found");
  }

  writeFileSync(OUTPUT, JSON.stringify({ products, url: page.url() }, null, 2));
  console.log(`\nResults saved to ${OUTPUT}`);
});
