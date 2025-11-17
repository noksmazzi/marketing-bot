// uploader/pinterest.js
const { chromium } = require('playwright');
const path = require('path');

async function uploadToPinterest({
  boardUrl,
  imagePath,
  title,
  description,
  username,
  password,
  headless = true
}) {
  if (!boardUrl) throw new Error("Missing Pinterest board URL");
  if (!imagePath) throw new Error("Missing imagePath");

  console.log("Launching Pinterest browser...");

  const browser = await chromium.launch({
    headless: headless,
    args: [
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
    console.log("Opening Pinterest login page...");
    await page.goto('https://www.pinterest.com/login/', { waitUntil: "networkidle" });

    // Login
    console.log("Logging in...");
    await page.fill('input[name="id"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(6000);

    // Go to Pin Builder
    console.log("Opening Create Pin page...");
    await page.goto('https://www.pinterest.com/pin-builder/', { waitUntil: "networkidle" });
    await page.waitForTimeout(4000);

    // Upload image
    console.log("Uploading image...");
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) throw new Error("Pinterest file input not found");
    await fileInput.setInputFiles(path.resolve(imagePath));

    await page.waitForTimeout(5000);

    // Enter Title
    try {
      await page.fill('textarea[data-test-id="pin-draft-title"]', title);
    } catch (_) {
      console.log("Title field not found.");
    }

    // Enter Description
    try {
      await page.fill('textarea[data-test-id="pin-draft-description"]', description);
    } catch (_) {
      console.log("Description field not found.");
    }

    await page.waitForTimeout(2000);

    // Select Board
    console.log("Selecting board...");
    await page.click('[data-test-id="board-dropdown-select-button"]');
    await page.waitForTimeout(2000);

    // Try picking board by name
    try {
      const boardName = boardUrl.split('/').pop();
      await page.click(`text="${boardName}"`);
    } catch (err) {
      console.log("Could not auto-select board. Pinterest UI may have changed.");
    }

    await page.waitForTimeout(2000);

    // Publish Pin
    console.log("Publishing pin...");
    try {
      await page.click('button[data-test-id="board-dropdown-save-button"]');
    } catch (_) {
      console.log("Could not click publish button.");
    }

    await page.waitForTimeout(6000);
    console.log("Pinterest upload complete.");

  } catch (err) {
    console.log("Pinterest upload error:", err);
  } finally {
    await browser.close();
  }
}

module.exports = { uploadToPinterest };
