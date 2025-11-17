// uploader/tiktok.js
const { chromium } = require('playwright');
const path = require('path');

async function uploadToTikTok({
  videoFile,
  caption,
  username,
  password,
  headless = true
}) {
  if (!videoFile) throw new Error('No videoFile provided');

  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless: headless,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox"
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/118 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    console.log('Opening TikTok login page...');
    await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle' });

    // Use email/username login
    await page.waitForTimeout(5000);

    // Click "Use phone / email / username"
    try {
      await page.click('text="Use phone / email / username"');
      await page.waitForTimeout(2000);
    } catch (_) {
      console.log("Login path maybe changed, continuing...");
    }

    // Click "Email / Username"
    try {
      await page.click('text="Email / Username"');
      await page.waitForTimeout(2000);
    } catch (_) {}

    // Fill username
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    // Click Login
    await page.click('button:has-text("Log in")');

    console.log("Waiting for login...");
    await page.waitForTimeout(8000);

    // Navigate to upload page
    console.log("Opening upload page...");
    await page.goto('https://www.tiktok.com/upload?lang=en', { waitUntil: 'networkidle' });

    // Wait for file chooser
    console.log("Uploading video...");
    const fileInput = await page.$('input[type="file"]');

    if (!fileInput) {
      throw new Error("TikTok upload file box not found (TikTok UI changed).");
    }

    await fileInput.setInputFiles(path.resolve(videoFile));

    // Wait for processing screen
    console.log("Waiting for TikTok to process video...");
    await page.waitForTimeout(15000);

    // Add caption
    try {
      await page.fill('textarea[placeholder*="Describe your video"]', caption);
    } catch (_) {
      console.log("Caption textarea not found.");
    }

    // Click POST
    console.log("Posting video...");
    try {
      await page.click('button:has-text("Post")');
    } catch (e) {
      console.log("Could not click Post button:", e.message);
    }

    await page.waitForTimeout(8000);
    console.log("TikTok upload attempt finished.");

  } catch (err) {
    console.error("TikTok upload error:", err);
  } finally {
    await browser.close();
  }
}

module.exports = { uploadToTikTok };
