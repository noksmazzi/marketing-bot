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

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

// Dependencies
const cron = require("node-cron");
const { fetchNewImages } = require("./gumroad_fetcher");
const { createPhotoVideo } = require("./generator");
const { uploadToPinterest } = require("./uploader/pinterest");
const { uploadToTikTok } = require("./uploader/tiktok");

// ---------------------------------------------------------
// 📥 Download image helper
// ---------------------------------------------------------
async function downloadImage(url) {
  console.log("📥 Downloading image:", url);
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to download image: ${res.status}`);
  }

  const buffer = await res.buffer();
  const filePath = path.join(__dirname, "temp_image.jpg");
  fs.writeFileSync(filePath, buffer);

  console.log("📁 Image saved to:", filePath);
  return filePath;
}

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

    // Accept comma-separated list or single URL
    if (typeof productUrls === "string" && productUrls.includes(",")) {
      productUrls = productUrls.split(",").map(u => u.trim());
    } else {
      productUrls = [productUrls];
    }

    console.log("📦 Using product URL:", productUrls[0]);

    // ---------------------------------------------------------
    // 1️⃣ Fetch new Gumroad images
    // ---------------------------------------------------------
    console.log("📥 Fetching Gumroad images...");
    const images = await fetchNewImages(productUrls[0]);

    if (!images || images.length === 0) {
      console.log("⚠️ No new images found.");
      return;
    }

    const latest = images[0];
    console.log("✔️ Found new image:", latest);

    // ---------------------------------------------------------
    // 2️⃣ Download image locally
    // ---------------------------------------------------------
    const localImagePath = await downloadImage(latest);

    // ---------------------------------------------------------
    // 3️⃣ Create TikTok-style video (CORRECT FORMAT)
    // ---------------------------------------------------------
    console.log("🎬 Generating video...");
    const videoPath = await createPhotoVideo({
      images: [localImagePath],   // MUST be an array!!
      musicPath: null,            // Add music file if you want
      outDir: "./tmp"
    });

    console.log("✔️ Video ready:", videoPath);

    // ---------------------------------------------------------
    // 4️⃣ Upload to Pinterest (CORRECT FORMAT)
    // ---------------------------------------------------------
    console.log("📌 Uploading to Pinterest...");
    await uploadToPinterest({
      boardUrl: process.env.PINTEREST_BOARD_URL,
      imagePath: localImagePath,
      title: "New aesthetic wallpaper",
      description: "Aesthetic phone wallpaper ✨",
      username: process.env.PINTEREST_EMAIL,
      password: process.env.PINTEREST_PASSWORD,
      headless: true
    });
    console.log("✔️ Posted on Pinterest");

    // ---------------------------------------------------------
    // 5️⃣ Upload to TikTok (CORRECT FORMAT)
    // ---------------------------------------------------------
    console.log("🎵 Uploading to TikTok...");
    await uploadToTikTok({
      videoFile: videoPath,
      caption: "Aesthetic wallpaper 💫",
      headless: true,
    });
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
