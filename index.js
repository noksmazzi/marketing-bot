require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cron = require('cron').CronJob;

const { fetchNewImages } = require('./gumroad_fetcher.js');
const { createPhotoVideo } = require('./generator.js');
const { uploadToTikTok } = require('./uploader/tiktok.js');
const { uploadToPinterest } = require('./uploader/pinterest.js');

const IMAGES_DIR = process.env.IMAGES_DIR || './images';
const MUSIC_DIR = process.env.MUSIC_DIR || './music';
const OUT_DIR = process.env.OUT_DIR || './tmp';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Track posted images
const postedFile = path.join(OUT_DIR, 'posted.json');
let posted = { images: [] };

if (fs.existsSync(postedFile)) {
  try {
    posted = JSON.parse(fs.readFileSync(postedFile));
  } catch (e) {
    posted = { images: [] };
  }
}

function pickUnpostedImages(n = 6) {
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  const unposted = files.filter(f => !posted.images.includes(f));
  return unposted.slice(0, n).map(f => path.join(IMAGES_DIR, f));
}

function pickMusic() {
  if (!fs.existsSync(MUSIC_DIR)) return null;
  const files = fs.readdirSync(MUSIC_DIR)
    .filter(f => /\.(mp3|m4a|wav)$/i.test(f));
  return files.length ? path.join(MUSIC_DIR, files[0]) : null;
}

function markAsPosted(imagePaths) {
  const names = imagePaths.map(p => path.basename(p));
  posted.images = [...new Set([...posted.images, ...names])];
  fs.writeFileSync(postedFile, JSON.stringify(posted, null, 2));
}

async function createAndPostOnce() {
  console.log('=== START createAndPostOnce ===', new Date().toISOString());

  try {
    // 1) Fetch new images from Gumroad
    const downloaded = await fetchNewImages();
    if (downloaded.length) {
      console.log('Downloaded from Gumroad:', downloaded);
    } else {
      console.log('No new Gumroad images.');
    }

    // 2) Pick images
    const images = pickUnpostedImages(6);
    if (images.length === 0) {
      console.log('No new images to post.');
      return;
    }

    console.log('Images used:', images);

    // 3) Create video collage
    const music = pickMusic();
    const caption = `New wallpaper drop! #wallpaper #Aesthetic ${new Date().toLocaleString('en-ZA')}`;

    const video = await createPhotoVideo({
      images,
      musicPath: music,
      outDir: OUT_DIR
    });

    console.log('Created video:', video);

    // 4) Upload to TikTok using COOKIE login
    try {
      await uploadToTikTok({
        videoFile: video,
        caption,
        headless: process.env.HEADLESS === 'true'
      });
    } catch (e) {
      console.log('TikTok upload error:', e.message);
    }

    // 5) Upload to Pinterest (if credentials provided)
    if (process.env.PINTEREST_USER) {
      try {
        await uploadToPinterest({
          boardUrl: process.env.PINTEREST_BOARD,
          imagePath: images[0],
          title: 'New Wallpaper Pack',
          description: caption,
          username: process.env.PINTEREST_USER,
          password: process.env.PINTEREST_PASS
        });
      } catch (e) {
        console.log('Pinterest upload error:', e.message);
      }
    }

    // 6) Mark images as posted
    markAsPosted(images);

    console.log('=== DONE createAndPostOnce ===');

  } catch (err) {
    console.error('ERROR IN createAndPostOnce:', err);
  }
}

// Daily schedule at 10:00
const cronExpr = process.env.SCHEDULE_CRON || '0 10 * * *';
console.log('Scheduler set:', cronExpr);

// Cron job
const job = new cron(
  cronExpr,
  createAndPostOnce,
  null,
  true,
  'Africa/Johannesburg'
);

// Run immediately & continue on schedule
createAndPostOnce();
job.start();
