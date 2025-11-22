// ---------------------------------------------------------
// ✅ POLYFILLS
// ---------------------------------------------------------
const fetchPkg = require("node-fetch");
const { Blob, File, FormData } = fetchPkg;

globalThis.fetch = (...args) => fetchPkg(...args);
globalThis.Blob = Blob;
globalThis.File = File;
globalThis.FormData = FormData;

// Load environment variables
require("dotenv").config();

// Dependencies
const cron = require("node-cron");
const { fetchNewImages } = require("./gumroad_fetcher");
const { createPhotoVideo } = require("./generator");
const uploadToPinterest = require("./uploader/pinterest");
const uploadToTikTok = require("./uploader/tiktok");

// ---------------------------------------------------------
// MAIN BOT FUNCTION
// ---------------------------------------------------------
async function runBot() {
  console.log("🚀 Bot starting...");

  try {
    // ---------------------------------------
    // 🔗 READ GUMROAD URL(S) FROM SECRET
    // ---------------------------------------
    let productUrls = process.env.GUMROAD_PRODUCT_URLS;

    if (!productUrls) {
      throw new Error("GUMROAD_PRODUCT_URLS is missing or empty!");
    }

    // If it's stored as a comma-separated string
    if (typeof productUrls === "string" && productUrls.includes(",")) {
      productUrls = productUrls.split(",").map(u => u.trim());
    } else {
      productUrls = [productUrls];
    }

    console.log("📦 Using product URL:", productUrls[0]);

    // ---------------------------------------------------------
    // 1️⃣ Fetch new Gumroad images
    // ---------------------------------------------------------
    console.log("📥 Fetching Gumroad images from ALL products...");
    const images = await fetchNewImages(productUrls[0]);

    if (!images || images.length === 0) {
      console.log("⚠️ No new images found.");
      return;
    }

    const latest = images[0];
    console.log("✔️ Found new image:", latest);

    // 2️⃣ Create TikTok-style video
    console.log("🎬 Generating video...");
    const videoPath = await createPhotoVideo(latest);
    console.log("✔️ Video ready:", videoPath);

    // 3️⃣ Upload to Pinterest
    console.log("📌 Uploading to Pinterest...");
    await uploadToPinterest(latest, "New aesthetic wallpaper");
    console.log("✔️ Posted on Pinterest");

    // 4️⃣ Upload to TikTok
    console.log("🎵 Uploading to TikTok...");
    await uploadToTikTok(videoPath, "Aesthetic wallpaper 💫");
    console.log("✔️ Posted on TikTok");

  } catch (err) {
    console.error("❌ BOT ERROR:", err);
  }
}

// ---------------------------------------------------------
// Run immediately
// ---------------------------------------------------------
runBot();

// ---------------------------------------------------------
// Cron: every 30 minutes
// ---------------------------------------------------------
cron.schedule("*/30 * * * *", () => {
  console.log("⏳ Scheduled run triggered...");
  runBot();
});
