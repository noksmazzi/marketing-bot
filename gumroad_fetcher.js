const fetch = require("node-fetch");

async function fetchNewImages(productUrl) {
    try {
        console.log("🔍 Raw productUrl received:", productUrl);

        if (Array.isArray(productUrl)) productUrl = productUrl[0];

        if (!productUrl || typeof productUrl !== "string") {
            throw new Error("Invalid productUrl");
        }

        // Extract product slug
        const slugMatch = productUrl.match(/\/l\/([^\/\?]+)/);
        if (!slugMatch) throw new Error("Could not extract product slug from URL");

        const productId = slugMatch[1];
        console.log("🔗 Product ID:", productId);

        // Official Gumroad API
        const apiUrl = `https://api.gumroad.com/v2/products/${productId}`;

        console.log("📡 Fetching Gumroad API:", apiUrl);

        const res = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${process.env.GUMROAD_API_KEY}`,
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            throw new Error(`API fetch failed: ${res.status}`);
        }

        const data = await res.json();
        console.log("📦 Gumroad API keys:", Object.keys(data));

        let images = [];

        // Gumroad API returns product object inside "product"
        const p = data.product;

        if (p.preview_url) images.push(p.preview_url);

        if (Array.isArray(p.previews)) {
            images.push(
                ...p.previews
                    .map(img => img.large_url || img.url)
                    .filter(Boolean)
            );
        }

        images = [...new Set(images)];

        console.log(`📸 Extracted ${images.length} images`);
        return images;

    } catch (err) {
        console.error("❌ Gumroad scraper error:", err.message);
        return [];
    }
}

module.exports = { fetchNewImages };
