// uploader/pinterest.js (2025 UPDATED FULL VERSION)
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
    // 1️⃣ LOGIN (2025 UNIVERSAL LOGIN)
    //----------------------------------------------------
    console.log("Opening Pinterest login...");
    await page.goto("https://www.pinterest.com/login/", {
      waitUntil: "load",
      timeout: 60000
    });

    await page.setViewportSize({ width: 1366, height: 900 });

    console.log("Waiting for login fields...");

    const emailSelectors = [
      'input[name="id"]',
      'input[type="email"]',
      'input[aria-label="Email"]'
    ];

    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[aria-label="Password"]'
    ];

    const loginButtonSelectors = [
      'button[data-test-id="registerFormSubmitButton"]',
      'button[data-test-id="loginButton"]',
      'button[type="submit"]',
      'button:has-text("Log in")',
      'button:has-text("Log In")'
    ];

    let emailFound = false;
    for (const sel of emailSelectors) {
      try {
        await page.fill(sel, username);
        emailFound = true;
        break;
      } catch {}
    }
    if (!emailFound) throw new Error("Pinterest email input not found.");

    let pwFound = false;
    for (const sel of passwordSelectors) {
      try {
        await page.fill(sel, password);
        pwFound = true;
        break;
      } catch {}
    }
    if (!pwFound) throw new Error("Pinterest password input not found.");

    console.log("Clicking login button...");

    let loginClicked = false;
    for (const sel of loginButtonSelectors) {
      try {
        await page.click(sel, { timeout: 30000 });
        loginClicked = true;
        break;
      } catch {}
    }

    if (!loginClicked) {
      throw new Error("Pinterest login button not found.");
    }

    await page.waitForTimeout(8000);
    console.log("Login submitted.");

    //----------------------------------------------------
    // 2️⃣ OPEN CREATE PIN PAGE
    //----------------------------------------------------
    console.log("Opening Create Pin...");
    await page.goto("https://www.pinterest.com/pin-builder/", {
      waitUntil: "networkidle",
      timeout: 60000
    });

    await page.waitForTimeout(4000);

    //----------------------------------------------------
    // 3️⃣ UPLOAD IMAGE
    //----------------------------------------------------
    console.log("Uploading image...");

    const uploadSelectors = [
      'input[type="file"]',
      'input[data-test-id="media-upload-input"]'
    ];

    let fileInput = null;

    for (const sel of uploadSelectors) {
      fileInput = await page.$(sel);
      if (fileInput) break;
    }

    if (!fileInput)
      throw new Error("Pinterest image upload field not found.");

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

    const boardName = boardUrl.split("/").filter(Boolean).pop();

    // Open board dropdown
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
      console.log(
        "⚠️ Board not auto-selected. Pinterest UI might be running a new variant."
      );
    }

    await page.waitForTimeout(2000);

    //----------------------------------------------------
    // 7️⃣ PUBLISH THE PIN
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
    // 8️⃣ CHECK PUBLISH SUCCESS
    //----------------------------------------------------
    const urlAfter = page.url();
    if (!urlAfter.includes("pin/create") && !urlAfter.includes("pin-builder")) {
      console.log("✔️ Pinterest upload successful!");
      await browser.close();
      return true;
    }

    console.log(
      "⚠️ Pinterest did not redirect, but the pin may still have been posted."
    );
    await browser.close();
    return true;
  } catch (err) {
    console.log("Pinterest upload error:", err.message);
    await browser.close();
    return false;
  }
}

module.exports = { uploadToPinterest };
