// gumroad_fetcher.js
require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { v4: uuidv4 } = require('uuid');

const IMAGES_DIR = process.env.IMAGES_DIR || './images';

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// ----------------------------
// DOWNLOAD FILE
// ----------------------------
async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const stream = fs.createWriteStream(destPath);
  return new Promise((resolve, reject) => {
    res.body.pipe(stream);
    res.body.on('error', reject);
    stream.on('finish', resolve);
  });
}

// ----------------------------
// LOCAL IMAGES
// ----------------------------
function listLocalImages() {
  return new Set(
    fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
  );
}

// ----------------------------
// SCRAPE A SINGLE URL
// ----------------------------
async function scrapeSingleProduct(url) {
  console.log(`🔍 Scraping: ${url}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load product page: ${url}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  const urls = new Set();

  // IMG tags
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && /\.(jpe?g|png|webp)$/i.test(src)) {
      if (src.startsWith('//')) urls.add('https:' + src);
      else if (src.startsWith('/')) {
        const base = new URL(url);
        urls.add(base.origin + src);
      } else urls.add(src);
    }
  });

  // Downloadable <a> links
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && /\.(jpe?g|png|webp)$/i.test(href)) {
      if (href.startsWith('//')) urls.add('https:' + href);
      else if (href.startsWith('/')) {
        const base = new URL(url);
        urls.add(base.origin + href);
      } else urls.add(href);
    }
  });

  const local = listLocalImages();
  const downloaded = [];

  for (const imgUrl of urls) {
    try {
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const filename = uuidv4() + ext;

      if (local.has(filename)) continue;

      const dest = path.join(IMAGES_DIR, filename);
      await downloadFile(imgUrl, dest);

      downloaded.push(dest);
      console.log('✔ Downloaded:', dest);

    } catch (e) {
      console.log('❌ Failed:', imgUrl, e.message);
    }
  }

  return downloaded;
}

// ----------------------------
// MAIN EXPORT — MULTI URL
// ----------------------------
async function fetchNewImages() {
  // NEW: Read all URLs
  const list = process.env.GUMROAD_PRODUCT_URLS;

  if (!list) {
    console.log("❌ No GUMROAD_PRODUCT_URLS found in secrets.");
    return [];
  }

  const urls = list.split(",").map(u => u.trim()).filter(Boolean);
  let allImages = [];

  for (const url of urls) {
    try {
      const newImgs = await scrapeSingleProduct(url);
      allImages.push(...newImgs);
    } catch (err) {
      console.log(`❌ Failed scraping ${url}:`, err.message);
    }
  }

  return allImages;
}

module.exports = { fetchNewImages };
