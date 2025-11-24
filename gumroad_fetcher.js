// gumroad_fetcher.js
const fetch = require("node-fetch");

// -----------------------------------------
// Retry helper (fixes Gumroad 504 errors)
// -----------------------------------------
async function fetchWithRetry(url, attempts = 4, delay = 1500) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 15000,
      });

      if (!res.ok) {
        if (res.status >= 500 && i < attempts - 1) {
          console.log(`⚠️ Gumroad ${res.status}. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw new Error(`Failed to load Gumroad page: ${res.status}`);
      }

      return await res.text();
    } catch (err) {
      if (i === attempts - 1) throw err;
      console.log(`⚠️ Retry ${i + 1}/${attempts} due to: ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// -----------------------------------------
// Main scraper
// -----------------------------------------
async function fetchNewImages(productUrl) {
  try {
    if (Array.isArray(productUrl)) productUrl = productUrl[0];
    if (!productUrl || typeof productUrl !== "string") {
      throw new Error("Invalid productUrl");
    }

    const cleanUrl = productUrl.split("?")[0];
    console.log("🌍 Fetching Gumroad HTML:", cleanUrl);

    const html = await fetchWithRetry(cleanUrl);

    let images = [];

    // 1️⃣ og:image
    const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    if (ogMatch) images.push(ogMatch[1]);

    // 2️⃣ All images in the HTML
    const galleryMatches = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)]
      .map(m => m[1])
      .filter(src =>
        src.includes("gumroad") &&
        (src.endsWith(".jpg") || src.endsWith(".jpeg") || src.endsWith(".png"))
      );

    images.push(...galleryMatches);

    images = [...new Set(images)];

    console.log(`📸 Extracted ${images.length} Gumroad images.`);
    return images;
  } catch (err) {
    console.error("❌ Gumroad scraper error:", err.message);
    return [];
  }
}

module.exports = { fetchNewImages };
