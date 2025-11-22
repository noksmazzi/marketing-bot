const fetch = require("node-fetch");

// Main function to fetch NEW images from a Gumroad product
async function fetchNewImages(productUrl) {
    try {
        console.log("🔍 Raw productUrl received:", productUrl);

        // Convert array → string if needed
        if (Array.isArray(productUrl)) {
            productUrl = productUrl[0];
        }

        if (!productUrl || typeof productUrl !== "string") {
            throw new Error("Invalid productUrl (not a string)");
        }

        // Remove tracking params
        const cleanUrl = productUrl.split("?")[0];

        // Extract product slug (ID) from Gumroad URL
        // Example:
        // https://thewandacreates.gumroad.com/l/ofawui → "ofawui"
        const slugMatch = cleanUrl.match(/\/l\/([^\/\?]+)/);
        if (!slugMatch) {
            throw new Error("Could not extract product slug from URL");
        }

        const productId = slugMatch[1];
        console.log("🔗 Product ID:", productId);

        // Correct API URL
        const apiUrl = `https://gumroad.com/discover/api/products/${productId}`;
        console.log("📡 Fetching Gumroad API:", apiUrl);

        const res = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            throw new Error(`API fetch failed: ${res.status}`);
        }

        const data = await res.json();
        console.log("📦 Gumroad API response keys:", Object.keys(data));

        let images = [];

        // Preview image
        if (data.preview_url) images.push(data.preview_url);

        // Gallery
        if (Array.isArray(data.preview_urls)) {
            images.push(...data.preview_urls);
        }

        // Marketing images
        if (Array.isArray(data.marketing_images)) {
            images.push(
                ...data.marketing_images
                    .map(img => img.large_url || img.url)
                    .filter(Boolean)
            );
        }

        // Remove duplicates
        images = [...new Set(images)];

        console.log(`📸 Extracted ${images.length} images from Gumroad`);
        return images;

    } catch (err) {
        console.error("❌ Gumroad scraper error:", err.message);
        return [];
    }
}

module.exports = { fetchNewImages };
