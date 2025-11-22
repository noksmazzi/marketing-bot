const fetch = require("node-fetch");

async function fetchNewImages(productUrl) {
    try {
        console.log("🔍 Raw productUrl received:", productUrl);

        if (Array.isArray(productUrl)) productUrl = productUrl[0];
        if (!productUrl || typeof productUrl !== "string") {
            throw new Error("Invalid productUrl");
        }

        const cleanUrl = productUrl.split("?")[0];

        console.log("🌍 Fetching product HTML:", cleanUrl);

        const res = await fetch(cleanUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!res.ok) {
            throw new Error(`Failed to load Gumroad page: ${res.status}`);
        }

        const html = await res.text();

        let images = [];

        // -------------------------------------
        // 1️⃣ Extract main product image (preview)
        // -------------------------------------
        const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
        if (ogMatch) {
            images.push(ogMatch[1]);
        }

        // -------------------------------------
        // 2️⃣ Extract gallery images
        // -------------------------------------
        const galleryMatches = [...html.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)]
            .map(m => m[1])
            .filter(src => 
                src.includes("gumroad") && 
                (src.endsWith(".jpg") || src.endsWith(".jpeg") || src.endsWith(".png"))
            );

        images.push(...galleryMatches);

        // Remove duplicates
        images = [...new Set(images)];

        console.log(`📸 Extracted ${images.length} images`);
        return images;

    } catch (err) {
        console.error("❌ Gumroad scraper error:", err.message);
        return [];
    }
}

module.exports = { fetchNewImages };
