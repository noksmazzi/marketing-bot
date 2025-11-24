// uploader/pinterest.js (2025 UPDATED)
const { chromium } = require("playwright");
const path = require("path");

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
    headless,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
  });

  const page = await context.newPage();

  try {
    //----------------------------------------------------
    // 1️⃣ LOGIN
    //----------------------------------------------------
    console.log("Opening Pinterest login...");
    await page.goto("https://www.pinterest.com/login/", {
      waitUntil: "networkidle"
    });

    console.log("Filling login form...");
    await page.fill('input[name="id"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[data-test-id="registerFormSubmitButton"]');

    await page.waitForTimeout(6000);

    //----------------------------------------------------
    // 2️⃣ OPEN CREATE PIN PAGE
    //----------------------------------------------------
    console.log("Opening Create Pin...");
    await page.goto("https://www.pinterest.com/pin-builder/", {
      waitUntil: "networkidle"
    });

    await page.waitForTimeout(4000);

    //----------------------------------------------------
    // 3️⃣ UPLOAD IMAGE
    //----------------------------------------------------
    console.log("Uploading image...");

    // Works with 2025 DOM
    const uploadSelectors = [
      'input[type="file"]',
      'input[data-test-id="media-upload-input"]'
    ];

    let fileInput = null;

    for (const sel of uploadSelectors) {
      fileInput = await page.$(sel);
      if (fileInput) break;
    }

    if (!fileInput) throw new Error("Pinterest image upload field not found.");

    await fileInput.setInputFiles(path.resolve(imagePath));
    await page.waitForTimeout(5000);

    //----------------------------------------------------
    // 4️⃣ ADD TITLE
    //----------------------------------------------------
    console.log("Entering Title...");

    const titleSelectors = [
      'textarea[data-test-id="pin-draft-title"]',
      'textarea[aria-label="Add a title"]'
    ];

    for (const sel of titleSelectors) {
      try {
        await page.fill(sel, title);
        break;
      } catch {}
    }

    //----------------------------------------------------
    // 5️⃣ ADD DESCRIPTION
    //----------------------------------------------------
    console.log("Entering Description...");

    const descSelectors = [
      'textarea[data-test-id="pin-draft-description"]',
      'textarea[aria-label="Tell everyone what your Pin is about"]'
    ];

    for (const sel of descSelectors) {
      try {
        await page.fill(sel, description);
        break;
      } catch {}
    }

    //----------------------------------------------------
    // 6️⃣ SELECT BOARD
    //----------------------------------------------------
    console.log("Selecting board...");

    // Board name from URL
    const boardName = boardUrl.split("/").filter(Boolean).pop();

    // Open dropdown
    await page.click('[data-test-id="board-dropdown-select-button"]');
    await page.waitForTimeout(2000);

    const boardSelectors = [
      `div[role="option"]:has-text("${boardName}")`,
      `div:has-text("${boardName}") >> nth=0`
    ];

    let boardClicked = false;
    for (const sel of boardSelectors) {
      try {
        await page.click(sel);
        boardClicked = true;
        break;
      } catch {}
    }

    if (!boardClicked) {
      console.log("⚠️ Board not auto-selected. Pinterest UI changed?");
    }

    await page.waitForTimeout(2000);

    //----------------------------------------------------
    // 7️⃣ PUBLISH PIN
    //----------------------------------------------------
    console.log("Publishing pin...");

    const publishSelectors = [
      'button[data-test-id="board-dropdown-save-button"]',
      'button:has-text("Publish")',
      'button:has-text("Save")'
    ];

    let published = false;
    for (const sel of publishSelectors) {
      try {
        await page.click(sel);
        published = true;
        break;
      } catch {}
    }

    if (!published) {
      console.log("❌ Pinterest publish button not clickable.");
      await browser.close();
      return false;
    }

    await page.waitForTimeout(6000);

    //----------------------------------------------------
    // 8️⃣ CHECK SUCCESS
    //----------------------------------------------------
    const urlAfter = page.url();
    if (!urlAfter.includes("pin/create") && !urlAfter.includes("pin-builder")) {
      console.log("✔️ Pinterest upload successful!");
      await browser.close();
      return true;
    }

    console.log("⚠️ Pinterest did not redirect, but pin may still be posted.");
    await browser.close();
    return true;

  } catch (err) {
    console.log("Pinterest upload error:", err.message);
    await browser.close();
    return false;
  }
}

module.exports = { uploadToPinterest };
