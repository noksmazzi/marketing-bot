// generator.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

async function createPhotoVideo({ images, musicPath, outDir = './tmp' }) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No images provided for video.');
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const id = uuidv4();
  const baseVideo = path.join(outDir, `${id}_base.mp4`);
  const finalVideo = path.join(outDir, `${id}_final.mp4`);
  const concatFile = path.join(outDir, `${id}_list.txt`);

  // Create a list file for ffmpeg concat
  const duration = 3; // each image shows for 3 seconds
  let listContent = '';

  images.forEach(img => {
    listContent += `file '${path.resolve(img)}'\n`;
    listContent += `duration ${duration}\n`;
  });

  // last image again (ffmpeg concat rule)
  listContent += `file '${path.resolve(images[images.length - 1])}'\n`;

  fs.writeFileSync(concatFile, listContent);

  console.log('FFmpeg: Creating base video...');

  // Step 1: Create the video from images
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions([
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        '-r 30'
      ])
      .output(baseVideo)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  console.log('FFmpeg: Base video created:', baseVideo);

  // Step 2: Add music (optional)
  if (musicPath) {
    console.log('FFmpeg: Adding music...');

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(baseVideo)
        .input(musicPath)
        .outputOptions([
          '-c:v copy',
          '-c:a aac',
          '-shortest'
        ])
        .output(finalVideo)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    console.log('FFmpeg: Final video created:', finalVideo);
    fs.unlinkSync(baseVideo); // remove temp file
    fs.unlinkSync(concatFile);
    return finalVideo;
  }

  // If no music, the base video is final
  fs.unlinkSync(concatFile);
  return baseVideo;
}

module.exports = { createPhotoVideo };
