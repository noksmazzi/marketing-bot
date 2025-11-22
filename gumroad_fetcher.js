const fetch = require("node-fetch");

// Extract JSON embedded in Gumroad product page
async function fetchNewImages(productUrl) {
    try {
        console.log("🔍 Raw productUrl received:", productUrl);

        if (Array.isArray(productUrl)) productUrl = productUrl[0];
        if (!productUrl || typeof productUrl !== "string") {
            throw new Error("Invalid productUrl");
        }

        // Remove tracking parameters
        const cleanUrl = productUrl.split("?")[0];

        console.log("🌍 Fetching product HTML:", cleanUrl);

        const res = await fetch(cleanUrl, {
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!res.ok) {
            throw new Error(`Failed to load Gumroad page: ${res.status}`);
        }

        const html = await res.text();

        // Look for the JSON embedded in the page
        const jsonMatch = html.match(
            /<script type="application\/json" id="product-json">([\s\S]*?)<\/script>/
        );

        if (!jsonMatch) {
            throw new Error("Could not find product JSON in page");
        }

        const jsonData = JSON.parse(jsonMatch[1]);

        console.log("📦 Product JSON keys:", Object.keys(jsonData));

        let images = [];

        // Main cover image
        if (jsonData.preview_url) {
            images.push(jsonData.preview_url);
        }

        // Gallery inside content_preview_files
        if (Array.isArray(jsonData.content_preview_files)) {
            images.push(
                ...jsonData.content_preview_files
                    .map(f => f.preview_url || f.large_url || f.url)
                    .filter(Boolean)
            );
        }

        // Marketing images, if any
        if (Array.isArray(jsonData.marketing_images)) {
            images.push(
                ...jsonData.marketing_images
                    .map(img => img.large_url || img.url)
                    .filter(Boolean)
            );
        }

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
