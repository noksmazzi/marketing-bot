// ---------------------------------------------------------
// Polyfills (required for Playwright uploads)
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
const cron = require("node-cron");

// Local modules
const { fetchNewImages } = require("./gumroad_fetcher");
const { createPhotoVideo } = require("./generator");
const { uploadToPinterest } = require("./uploader/pinterest");
const { uploadToTikTok } = require("./uploader/tiktok");

// ---------------------------------------------------------
// Download helper
// ---------------------------------------------------------
async function downloadImage(url) {
  console.log("📥 Downloading:", url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed: ${res.status}`);

  const buffer = await res.buffer();
  const filePath = path.join(__dirname, "temp_image.jpg");
  fs.writeFileSync(filePath, buffer);

  console.log("📁 Saved to:", filePath);
  return filePath;
}

// ---------------------------------------------------------
// Bot
// ---------------------------------------------------------
async function runBot() {
  console.log("🚀 Bot starting...");

  try {
    // Get Gumroad URL(s)
    let productUrls = process.env.GUMROAD_PRODUCT_URLS;
    if (!productUrls) throw new Error("GUMROAD_PRODUCT_URLS is missing!");

    productUrls = productUrls.includes(",")
      ? productUrls.split(",").map(u => u.trim())
      : [productUrls];

    console.log("📦 Using Gumroad URL:", productUrls[0]);

    // 1️⃣ Fetch images
    const images = await fetchNewImages(productUrls[0]);
    if (!images.length) {
      console.log("⚠️ No new images found.");
      return;
    }

    const latest = images[0];
    console.log("✔ Found:", latest);

    // 2️⃣ Download image
    const imgPath = await downloadImage(latest);

    // 3️⃣ Create video
    console.log("🎬 Creating video...");
    const videoPath = await createPhotoVideo({
      images: [imgPath],
      musicPath: null,
      outDir: "./tmp"
    });

    console.log("✔ Video ready:", videoPath);

    // 4️⃣ Pinterest
    console.log("📌 Uploading to Pinterest...");
    const pinSuccess = await uploadToPinterest({
      boardUrl: process.env.PINTEREST_BOARD_URL,
      imagePath: imgPath,
      title: "New aesthetic wallpaper",
      description: "Aesthetic phone wallpaper ✨",
      username: process.env.PINTEREST_EMAIL,
      password: process.env.PINTEREST_PASSWORD,
      headless: true
    });

    if (pinSuccess) console.log("✔ Posted on Pinterest");
    else console.log("❌ Pinterest upload failed");

    // 5️⃣ TikTok
    console.log("🎵 Uploading to TikTok...");
    const tiktokSuccess = await uploadToTikTok({
      videoFile: videoPath,
      caption: "Aesthetic wallpaper 💫",
      headless: true,
    });

    if (tiktokSuccess) console.log("✔ Posted on TikTok");
    else console.log("❌ TikTok upload failed");

  } catch (err) {
    console.error("❌ BOT ERROR:", err.message);
  }
}

// Run now
runBot();

// Cron schedule
cron.schedule("*/30 * * * *", () => {
  console.log("⏳ Scheduled run triggered...");
  runBot();
});
