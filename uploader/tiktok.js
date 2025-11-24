// uploader/tiktok.js
const { chromium } = require('playwright');
const path = require('path');

async function uploadToTikTok({ videoFile, caption, headless = true }) {
  if (!videoFile) throw new Error("No videoFile provided");

  const rawCookies = process.env.TIKTOK_COOKIES;

  if (!rawCookies) {
    throw new Error("❌ Missing TIKTOK_COOKIES secret. Must be JSON.");
  }

  let cookies;
  try {
    cookies = JSON.parse(rawCookies);
  } catch (e) {
    throw new Error("❌ TIKTOK_COOKIES is not valid JSON.");
  }

  console.log("Launching TikTok browser...");
  const browser = await chromium.launch({
    headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/118 Safari/537.36",
  });

  // Apply all cookies
  const formattedCookies = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: ".tiktok.com",
    path: "/",
    secure: true,
    httpOnly: false
  }));

  await context.addCookies(formattedCookies);

  const page = await context.newPage();

  try {
    console.log("Opening TikTok upload page...");
    await page.goto("https://www.tiktok.com/upload?lang=en", {
      waitUntil: "networkidle",
    });

    // Detect failed login
    if (page.url().includes("login")) {
      throw new Error(
        "❌ TikTok redirected to login — one or more cookies are expired."
      );
    }

    console.log("Uploading video...");

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error("❌ TikTok upload input not found (UI changed?)");
    }

    await fileInput.setInputFiles(path.resolve(videoFile));
    console.log("Video selected, waiting for processing...");

    await page.waitForTimeout(15000);

    console.log("Typing caption...");
    try {
      await page.fill('textarea[placeholder*="Describe your video"]', caption);
    } catch (e) {
      console.log("⚠ Caption box not found, continuing.");
    }

    console.log("Posting video...");
    await page.click('button:has-text("Post")');

    await page.waitForTimeout(8000);
    console.log("✅ TikTok upload completed!");

  } catch (err) {
    console.error("❌ TikTok upload error:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = { uploadToTikTok };
