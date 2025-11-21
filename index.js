// index.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const cron = require("cron").CronJob;

const { fetchNewImages } = require("./gumroad_fetcher");
const { createPhotoVideo } = require("./generator");
const { uploadToTikTok } = require("./uploader/tiktok");
const { uploadToPinterest } = require("./uploader/pinterest");

// === DIRECTORIES ===
const IMAGES_DIR = process.env.IMAGES_DIR || "./images";
const MUSIC_DIR = process.env.MUSIC_DIR || "./music";
const OUT_DIR = process.env.OUT_DIR || "./tmp";

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

// === TRACK POSTED ===
const postedFile = path.join(OUT_DIR, "posted.json");
let posted = { images: [] };

if (fs.existsSync(postedFile)) {
    try {
        posted = JSON.parse(fs.readFileSync(postedFile));
    } catch (_) {
        posted = { images: [] };
    }
}

function pickUnpostedImages(n = 6) {
    if (!fs.existsSync(IMAGES_DIR)) return [];

    const files = fs.readdirSync(IMAGES_DIR).filter(f =>
        /\.(jpg|jpeg|png|webp)$/i.test(f)
    );

    const unposted = files.filter(f => !posted.images.includes(f));
    return unposted.slice(0, n).map(f => path.join(IMAGES_DIR, f));
}

function pickMusic() {
    if (!fs.existsSync(MUSIC_DIR)) return null;

    const files = fs.readdirSync(MUSIC_DIR).filter(f =>
        /\.(mp3|m4a|wav)$/i.test(f)
    );

    return files.length ? path.join(MUSIC_DIR, files[0]) : null;
}

function markAsPosted(imagePaths) {
    const names = imagePaths.map(p => path.basename(p));
    posted.images = [...new Set([...posted.images, ...names])];
    fs.writeFileSync(postedFile, JSON.stringify(posted, null, 2));
}

// === MAIN ACTION ===
async function createAndPostOnce() {
    console.log("=== START BOT RUN ===", new Date().toISOString());

    try {
        // 1) Fetch from Gumroad
        const downloaded = await fetchNewImages();
        if (downloaded.length) {
            console.log("Downloaded from Gumroad:", downloaded);
        }

        // 2) Choose images
        const images = pickUnpostedImages(6);
        if (images.length === 0) {
            console.log("No new images to post.");
            return;
        }

        console.log("Images selected:", images);

        // 3) Create video
        const music = pickMusic();
        const caption = `New wallpaper drop! #wallpaper #aesthetic ${new Date().toLocaleString("en-ZA")}`;

        const video = await createPhotoVideo({
            images,
            musicPath: music,
            outDir: OUT_DIR
        });

        console.log("Created video:", video);

        // 4) TikTok upload (cookie or login)
        try {
            await uploadToTikTok({
                videoFile: video,
                caption,
                cookie: process.env.TIKTOK_COOKIE || null,
                username: process.env.TIKTOK_USER,
                password: process.env.TIKTOK_PASS,
                headless: true
            });
        } catch (err) {
            console.error("TikTok upload failed:", err.message);
        }

        // 5) Pinterest
        try {
            if (process.env.PINTEREST_USER) {
                await uploadToPinterest({
                    boardUrl: process.env.PINTEREST_BOARD,
                    imagePath: images[0],
                    title: "New Wallpaper Pack",
                    description: caption,
                    username: process.env.PINTEREST_USER,
                    password: process.env.PINTEREST_PASS
                });
            }
        } catch (err) {
            console.error("Pinterest upload failed:", err.message);
        }

        // 6) Mark as posted
        markAsPosted(images);

        console.log("=== FINISHED BOT RUN ===");

    } catch (err) {
        console.error("Fatal error in createAndPostOnce:", err);
    }
}

// === CRON SCHEDULE ===
// Default: every day at 10:00
const cronExpr = process.env.SCHEDULE_CRON || "0 10 * * *";

console.log("Scheduler enabled:", cronExpr);

const job = new cron(
    cronExpr,
    createAndPostOnce,
    null,
    true,
    "Africa/Johannesburg"
);

// Run immediately also
createAndPostOnce();
