// uploader/tiktok.js
const { chromium } = require('playwright');
const path = require('path');

const REQUIRED_COOKIE_NAMES = [
  "sessionid","sessionid_ss","sid_tt","sid_guard",
  "sid_ucp_v1","ssid_ucp_v1","msToken","odin_tt","ttwid","passport_csrf_token"
];

async function validateCookiesJson(raw) {
  if (!raw) throw new Error("Missing TIKTOK_COOKIES secret.");
  let arr;
  try { arr = JSON.parse(raw); } catch (e) { throw new Error("TIKTOK_COOKIES must be valid JSON array."); }
  const map = new Map(arr.map(c => [c.name, c.value]));
  for (const name of REQUIRED_COOKIE_NAMES) {
    if (!map.has(name) || !map.get(name)) {
      throw new Error(`Missing cookie: ${name}`);
    }
  }
  return arr;
}

async function uploadToTikTok({ videoFile, caption, headless = true, debug = false }) {
  if (!videoFile) throw new Error("No videoFile provided");

  const rawCookies = process.env.TIKTOK_COOKIES;
  const cookies = await validateCookiesJson(rawCookies);

  const browser = await chromium.launch({ headless, args: ["--disable-blink-features=AutomationControlled","--no-sandbox","--disable-setuid-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/118 Safari/537.36",
  });

  // normalize and add cookies
  const formatted = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: ".tiktok.com",
    path: "/",
    secure: true,
    httpOnly: false
  }));
  await context.addCookies(formatted);

  const page = await context.newPage();

  try {
    console.log("Opening TikTok upload page...");
    const resp = await page.goto("https://www.tiktok.com/upload?lang=en", { waitUntil: "networkidle" });

    // If the navigation produced a 4xx/5xx -> treat as a failure
    if (resp && resp.status && resp.status() >= 400) {
      throw new Error(`Upload page returned status ${resp.status()}`);
    }

    // Detect redirect to login
    if (page.url().includes("/login") || page.url().includes("signin")) {
      throw new Error("TikTok redirected to login — one or more cookies are expired or invalid.");
    }

    // Extra authenticated check: go to home/profile and see if page contains indications of being logged in
    // Using a small check: request the main page and ensure it's not the login page
    const checkResp = await page.goto("https://www.tiktok.com/", { waitUntil: "networkidle" });
    if (checkResp && checkResp.status && checkResp.status() >= 400) {
      throw new Error(`Profile check returned status ${checkResp.status()}`);
    }
    const currentUrl = page.url();
    if (currentUrl.includes("login") || currentUrl.includes("signup")) {
      throw new Error("Not authenticated after cookie injection.");
    }

    // Back to upload
    await page.goto("https://www.tiktok.com/upload?lang=en", { waitUntil: "networkidle" });

    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error("TikTok upload input not found (UI changed?)");

    await fileInput.setInputFiles(path.resolve(videoFile));
    await page.waitForTimeout(15000);

    // Try to fill caption — tolerates selector changes
    try {
      await page.fill('textarea[placeholder*="Describe your video"]', caption);
    } catch (e) {
      console.log("Caption box not found, continuing.");
    }

    // Click Post - try multiple selectors if needed
    const postSelectors = ['button:has-text("Post")', 'button:has-text("Publish")', 'button[type="submit"]'];
    let clicked = false;
    for (const sel of postSelectors) {
      try {
        await page.click(sel);
        clicked = true;
        break;
      } catch (e) { /* ignore */ }
    }
    if (!clicked) throw new Error("Could not find a Post/Publish button. UI likely changed.");

    // wait and verify success: check for a toasts or redirect to /video or an upload success element
    await page.waitForTimeout(8000);

    // crude success heuristic: Did the upload UI disappear or URL change from /upload?
    const afterUrl = page.url();
    if (!afterUrl.includes("/upload")) {
      console.log("Detected URL change after posting; assuming success.");
      await browser.close();
      return true;
    }

    // fallback: try to detect an element that indicates success (toast)
    const toast = await page.$('text=Your video has been posted, text=Uploaded, text=Posted');
    await browser.close();
    return !!toast;

  } catch (err) {
    console.error("TikTok upload error:", err.message);
    await browser.close();
    return false;
  }
}

module.exports = { uploadToTikTok };
