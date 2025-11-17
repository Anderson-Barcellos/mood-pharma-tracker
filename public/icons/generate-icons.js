#!/usr/bin/env node
/**
 * Icon Generator for PWA
 * Creates placeholder icons with glassmorphism theme
 * Run with: node generate-icons.js
 */

import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const theme = {
  teal: '#00adad',
  tealDark: '#008a8a',
  background: '#0a0a0a',
  glass: 'rgba(255, 255, 255, 0.1)',
};

function generateIcon(size, maskable = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const padding = maskable ? size * 0.2 : 0; // Safe zone for maskable icons
  const actualSize = size - (padding * 2);

  // Background gradient
  const bgGradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  bgGradient.addColorStop(0, theme.teal);
  bgGradient.addColorStop(1, theme.tealDark);

  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, size, size);

  // Glassmorphic overlay
  ctx.fillStyle = theme.glass;
  ctx.fillRect(padding, padding, actualSize, actualSize);

  // Icon symbol - Heart rate + pill combination
  ctx.save();
  ctx.translate(size / 2, size / 2);

  // Heart rate line
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.04;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const lineWidth = actualSize * 0.6;
  const lineHeight = actualSize * 0.15;

  ctx.beginPath();
  ctx.moveTo(-lineWidth / 2, 0);
  ctx.lineTo(-lineWidth / 4, 0);
  ctx.lineTo(-lineWidth / 6, -lineHeight);
  ctx.lineTo(0, lineHeight);
  ctx.lineTo(lineWidth / 6, -lineHeight);
  ctx.lineTo(lineWidth / 4, 0);
  ctx.lineTo(lineWidth / 2, 0);
  ctx.stroke();

  // Pill symbol
  const pillRadius = actualSize * 0.12;
  const pillY = actualSize * 0.25;

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, pillY, pillRadius, 0, Math.PI * 2);
  ctx.fill();

  // Pill divider line
  ctx.strokeStyle = theme.teal;
  ctx.lineWidth = size * 0.015;
  ctx.beginPath();
  ctx.moveTo(-pillRadius, pillY);
  ctx.lineTo(pillRadius, pillY);
  ctx.stroke();

  ctx.restore();

  return canvas;
}

// Generate all icon sizes
sizes.forEach(size => {
  const canvas = generateIcon(size);
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(__dirname, `icon-${size}x${size}.png`), buffer);
  console.log(`✓ Generated icon-${size}x${size}.png`);
});

// Generate maskable icons
[192, 512].forEach(size => {
  const canvas = generateIcon(size, true);
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(join(__dirname, `icon-${size}x${size}-maskable.png`), buffer);
  console.log(`✓ Generated icon-${size}x${size}-maskable.png`);
});

console.log('\n✅ All icons generated successfully!');
