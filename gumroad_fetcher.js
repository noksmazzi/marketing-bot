const fetch = require("node-fetch");

async function fetchNewImages(productUrl) {
    try {
        // Convert product page into Gumroad product API URL
        const cleanUrl = productUrl.split("?")[0];
        const productPath = cleanUrl.replace("https://", "").replace("http://", "");

        // Gumroad hidden product JSON endpoint
        const apiUrl = `https://gumroad.com/discover/api/products/${productPath}`;

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

        // Extract images from Gumroad JSON
        let images = [];

        if (data.preview_url) images.push(data.preview_url);
        if (data.preview_urls && data.preview_urls.length > 0)
            images.push(...data.preview_urls);
        if (data.marketing_images && data.marketing_images.length > 0)
            images.push(...data.marketing_images.map(img => img.large_url));

        // Remove duplicates
        images = [...new Set(images)];

        return images;

    } catch (err) {
        console.error("❌ Gumroad scraper error:", err.message);
        return [];
    }
}

module.exports = { fetchNewImages };
