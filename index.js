// ---------------------------------------------------------
// ✅ POLYFILLS (Fix: "File is not defined", TikTok upload errors)
// ---------------------------------------------------------
const fetchPkg = require("node-fetch");
const { Blob, File, FormData } = fetchPkg;

globalThis.fetch = (...args) => fetchPkg(...args);
globalThis.Blob = Blob;
globalThis.File = File;
globalThis.FormData = FormData;

// ---------------------------------------------------------
// Load environment variables
// ---------------------------------------------------------
require("dotenv").config();

// ---------------------------------------------------------
// Dependencies
// ---------------------------------------------------------
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
    // 1️⃣ Fetch new Gumroad images
    console.log("📥 Fetching Gumroad images...");
    const images = await fetchNewImages();

    if (!images || images.length === 0) {
      console.log("⚠️ No new images found.");
      return;
    }

    const latest = images[0];
    console.log("✔️ Found:", latest.url);

    // 2️⃣ Create a TikTok video
    console.log("🎬 Generating video...");
    const videoPath = await createPhotoVideo(latest.url);
    console.log("✔️ Video ready:", videoPath);

    // 3️⃣ Upload to Pinterest
    console.log("📌 Uploading to Pinterest...");
    await uploadToPinterest(latest.url, latest.title);
    console.log("✔️ Posted on Pinterest");

    // 4️⃣ Upload to TikTok
    console.log("🎵 Uploading to TikTok...");
    await uploadToTikTok(videoPath, latest.title);
    console.log("✔️ Posted on TikTok");

  } catch (err) {
    console.error("❌ BOT ERROR:", err);
  }
}

// ---------------------------------------------------------
// Run immediately when GitHub Action triggers
// ---------------------------------------------------------
runBot();

// ---------------------------------------------------------
// Cron schedule (every 30 minutes)
// ---------------------------------------------------------
cron.schedule("*/30 * * * *", () => {
  console.log("⏳ Scheduled run triggered...");
  runBot();
});
