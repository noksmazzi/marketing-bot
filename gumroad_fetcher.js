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

// Download file from URL
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

// Get existing local images
function listLocalImages() {
  return new Set(
    fs.readdirSync(IMAGES_DIR).filter(f => /\.(jpe?g|png|webp)$/i.test(f))
  );
}

// ---- GUMROAD API FETCH ----
async function fetchFromGumroadAPI() {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  const permalink = process.env.GUMROAD_PERMALINK;

  if (!token || !permalink) {
    throw new Error('Gumroad API credentials missing');
  }

  const apiURL = `https://api.gumroad.com/v2/products/${encodeURIComponent(permalink)}`;
  const res = await fetch(apiURL, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error(`Gumroad API error: ${res.status}`);

  const data = await res.json();
  if (!data.product) throw new Error('Invalid Gumroad API response');

  const files = data.product.files || data.product.attachments || [];
  const local = listLocalImages();
  const downloaded = [];

  for (const file of files) {
    const url = file.download_url || file.url || file.file_url;
    if (!url) continue;

    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = (file.name || uuidv4()) + ext;

    if (local.has(filename)) continue;

    const dest = path.join(IMAGES_DIR, filename);
    try {
      await downloadFile(url, dest);
      downloaded.push(dest);
      console.log('Downloaded (API):', dest);
    } catch (e) {
      console.log('Failed to download file:', url, e.message);
    }
  }

  return downloaded;
}

// ---- SCRAPE PUBLIC PRODUCT PAGE ----
async function fetchFromGumroadScrape() {
  const productUrl = process.env.GUMROAD_PRODUCT_URL;
  if (!productUrl) throw new Error('GUMROAD_PRODUCT_URL missing');

  const res = await fetch(productUrl);
  if (!res.ok) throw new Error('Failed to load product page.');

  const html = await res.text();
  const $ = cheerio.load(html);

  const urls = new Set();

  // Scrape <img> tags
  $('img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && /\.(jpe?g|png|webp)$/i.test(src)) {
      if (src.startsWith('//')) urls.add('https:' + src);
      else if (src.startsWith('/')) {
        const base = new URL(productUrl);
        urls.add(base.origin + src);
      } else urls.add(src);
    }
  });

  // Scrape <a> download links
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && /\.(jpe?g|png|webp)$/i.test(href)) {
      if (href.startsWith('//')) urls.add('https:' + href);
      else if (href.startsWith('/')) {
        const base = new URL(productUrl);
        urls.add(base.origin + href);
      } else urls.add(href);
    }
  });

  const local = listLocalImages();
  const downloaded = [];

  for (const url of urls) {
    try {
      const ext = path.extname(new URL(url).pathname) || '.jpg';
      const filename = uuidv4() + ext;

      if (local.has(filename)) continue;

      const dest = path.join(IMAGES_DIR, filename);
      await downloadFile(url, dest);

      downloaded.push(dest);
      console.log('Downloaded (SCRAPE):', dest);

    } catch (e) {
      console.log('Failed to scrape download:', url, e.message);
    }
  }

  return downloaded;
}

// ---- MAIN EXPORT ----
async function fetchNewImages() {
  const method = (process.env.GUMROAD_METHOD || 'API').toUpperCase();

  try {
    if (method === 'API') {
      return await fetchFromGumroadAPI();
    } else {
      return await fetchFromGumroadScrape();
    }
  } catch (err) {
    console.log('Primary method failed:', err.message);
    console.log('Trying SCRAPE fallback...');
    try {
      return await fetchFromGumroadScrape();
    } catch (e2) {
      console.log('Scrape fallback failed too:', e2.message);
      return [];
    }
  }
}

module.exports = { fetchNewImages };
