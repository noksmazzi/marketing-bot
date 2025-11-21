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

const { chromium } = require('playwright');
const path = require('path');

async function uploadToTikTok({
  videoFile,
  caption,
  headless = true
}) {
  if (!videoFile) throw new Error('No videoFile provided');

  const tikTokCookie = process.env.TIKTOK_COOKIE;

  if (!tikTokCookie) {
    throw new Error("❌ No TikTok cookie found. Make sure TIKTOK_COOKIE is added as a GitHub Secret.");
  }

  console.log('Launching browser...');

  const browser = await chromium.launch({
    headless,
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

  // --- Inject TikTok login cookie ---
  await context.addCookies([
    {
      name: "sessionid",
      value: tikTokCookie,
      domain: ".tiktok.com",
      path: "/",
      httpOnly: true,
      secure: true
    }
  ]);

  const page = await context.newPage();

  try {
    console.log("Opening TikTok upload page...");
    await page.goto("https://www.tiktok.com/upload?lang=en", {
      waitUntil: "networkidle"
    });

    // If TikTok redirects to login, cookie is invalid
    if (page.url().includes("login")) {
      throw new Error("TikTok redirected to login — your sessionid cookie is expired or invalid.");
    }

    console.log("Uploading video...");
    const fileInput = await page.$('input[type="file"]');

    if (!fileInput) {
      throw new Error("TikTok upload file box not found (UI changed?).");
    }

    await fileInput.setInputFiles(path.resolve(videoFile));

    console.log("Waiting for TikTok to process video...");
    await page.waitForTimeout(15000);

    console.log("Adding caption...");
    try {
      await page.fill('textarea[placeholder*="Describe your video"]', caption);
    } catch (_) {
      console.log("Caption box not found.");
    }

    console.log("Posting video...");
    await page.click('button:has-text("Post")');

    await page.waitForTimeout(8000);
    console.log("✅ TikTok upload finished!");

  } catch (err) {
    console.error("TikTok upload error:", err);
  } finally {
    await browser.close();
  }
}

module.exports = { uploadToTikTok };
