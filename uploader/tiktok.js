// uploader/tiktok.js
const { chromium } = require('playwright');
const path = require('path');

async function uploadToTikTok({ videoFile, caption, headless = true }) {
  if (!videoFile) throw new Error("No videoFile provided");

  const sessionCookie = process.env.TIKTOK_COOKIE;
  if (!sessionCookie) {
    throw new Error("Missing TIKTOK_COOKIE GitHub Secret.");
  }

  console.log("Launching browser...");
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

  // Inject TikTok session cookie
  await context.addCookies([
    {
      name: "sessionid",
      value: sessionCookie,
      domain: ".tiktok.com",
      path: "/",
      httpOnly: true,
      secure: true,
    },
  ]);

  const page = await context.newPage();

  try {
    console.log("Opening upload page...");
    await page.goto("https://www.tiktok.com/upload?lang=en", {
      waitUntil: "networkidle",
    });

    if (page.url().includes("login")) {
      throw new Error(
        "TikTok redirected to login — your session cookie is expired or invalid."
      );
    }

    console.log("Uploading video...");
    const uploadInput = await page.$('input[type="file"]');

    if (!uploadInput) {
      throw new Error("TikTok upload field not found (UI changed?)");
    }

    await uploadInput.setInputFiles(path.resolve(videoFile));

    console.log("Waiting for processing...");
    await page.waitForTimeout(15000);

    console.log("Entering caption...");
    try {
      await page.fill('textarea[placeholder*="Describe your video"]', caption);
    } catch (e) {
      console.log("Caption box not found.");
    }

    console.log("Posting video...");
    await page.click('button:has-text("Post")');
    await page.waitForTimeout(8000);

    console.log("✅ TikTok upload complete!");
  } catch (err) {
    console.error("TikTok upload error:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = { uploadToTikTok };
