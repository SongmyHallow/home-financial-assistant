#!/usr/bin/env node
/**
 * Generate placeholder PNG icons for PWA
 * Creates minimal but valid PNG files with blue color
 */

const fs = require('fs');
const path = require('path');

const iconDir = path.join(__dirname, '../public/icons');

// Ensure directory exists
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

/**
 * Create a simple solid-color PNG buffer
 * Width and height are set to the desired size
 * Color is a solid blue (#2563eb)
 */
function createPNG(width, height) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk (image header)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk (image data) - simple blue solid color
  // For simplicity, create a minimal scanline with blue pixels
  const pixelData = Buffer.alloc(width * height * 3 + height);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    pixelData[pos++] = 0; // filter type (none)
    for (let x = 0; x < width; x++) {
      pixelData[pos++] = 37;  // R: #25
      pixelData[pos++] = 99;  // G: #63
      pixelData[pos++] = 235; // B: #eb
    }
  }

  const zlib = require('zlib');
  const compressed = require('zlib').deflateSync(pixelData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk (end)
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crc32 = calculateCRC32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function calculateCRC32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crc ^ buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const sizes = [192, 512];
sizes.forEach(size => {
  try {
    const buffer = createPNG(size, size);
    const filePath = path.join(iconDir, `icon-${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Created icon-${size}.png (${buffer.length} bytes)`);
  } catch (err) {
    console.error(`✗ Failed to create icon-${size}.png:`, err.message);
  }
});

console.log('PWA icons generated successfully!');
