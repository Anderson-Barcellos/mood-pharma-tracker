#!/bin/bash
# Simple SVG icon generator for PWA
# Creates placeholder icons with glassmorphism theme

ICON_DIR="/root/CODEX/mood-pharma-tracker/public/icons"

# SVG template for the app icon
generate_svg() {
  local size=$1
  local padding=$2
  local actual_size=$((size - padding * 2))

  cat > "${ICON_DIR}/icon-${size}x${size}.svg" <<EOF
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg-gradient-${size}">
      <stop offset="0%" style="stop-color:#00adad;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#008a8a;stop-opacity:1" />
    </radialGradient>
  </defs>

  <!-- Background gradient -->
  <rect width="${size}" height="${size}" fill="url(#bg-gradient-${size})"/>

  <!-- Glassmorphic overlay -->
  <rect x="${padding}" y="${padding}" width="${actual_size}" height="${actual_size}"
        fill="rgba(255, 255, 255, 0.1)" rx="${size * 0.05}"/>

  <!-- Heart rate line -->
  <path d="M ${size * 0.2} ${size * 0.5}
           L ${size * 0.35} ${size * 0.5}
           L ${size * 0.4} ${size * 0.35}
           L ${size * 0.5} ${size * 0.65}
           L ${size * 0.6} ${size * 0.35}
           L ${size * 0.65} ${size * 0.5}
           L ${size * 0.8} ${size * 0.5}"
        stroke="white" stroke-width="${size * 0.04}"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>

  <!-- Pill symbol -->
  <circle cx="${size * 0.5}" cy="${size * 0.75}" r="${size * 0.12}" fill="white"/>
  <line x1="${size * 0.38}" y1="${size * 0.75}"
        x2="${size * 0.62}" y2="${size * 0.75}"
        stroke="#00adad" stroke-width="${size * 0.015}"/>

  <!-- App name -->
  <text x="${size / 2}" y="${size * 0.92}"
        text-anchor="middle"
        font-family="system-ui, sans-serif"
        font-size="${size * 0.08}"
        font-weight="600"
        fill="white">MoodPharma</text>
</svg>
EOF
}

# Generate standard sizes
echo "Generating SVG icons..."
generate_svg 192 0
generate_svg 512 0

# For maskable icons, add safe zone padding (20%)
generate_svg_maskable() {
  local size=$1
  local padding=$((size / 5))  # 20% safe zone

  cat > "${ICON_DIR}/icon-${size}x${size}-maskable.svg" <<EOF
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg-gradient-maskable-${size}">
      <stop offset="0%" style="stop-color:#00adad;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#008a8a;stop-opacity:1" />
    </radialGradient>
  </defs>

  <!-- Full bleed background for maskable -->
  <rect width="${size}" height="${size}" fill="url(#bg-gradient-maskable-${size})"/>

  <!-- Icon content with safe zone -->
  <g transform="translate(${padding}, ${padding})">
    <circle cx="$((size - padding * 2) / 2)" cy="$((size - padding * 2) / 2)"
            r="$((size - padding * 2) / 3)"
            fill="rgba(255, 255, 255, 0.15)"/>

    <path d="M $((size - padding * 2) * 0.2) $((size - padding * 2) * 0.45)
             L $((size - padding * 2) * 0.35) $((size - padding * 2) * 0.45)
             L $((size - padding * 2) * 0.4) $((size - padding * 2) * 0.3)
             L $((size - padding * 2) * 0.5) $((size - padding * 2) * 0.6)
             L $((size - padding * 2) * 0.6) $((size - padding * 2) * 0.3)
             L $((size - padding * 2) * 0.65) $((size - padding * 2) * 0.45)
             L $((size - padding * 2) * 0.8) $((size - padding * 2) * 0.45)"
          stroke="white" stroke-width="$((size - padding * 2) * 0.04)"
          stroke-linecap="round" stroke-linejoin="round" fill="none"/>

    <circle cx="$((size - padding * 2) / 2)" cy="$((size - padding * 2) * 0.7)"
            r="$((size - padding * 2) * 0.12)" fill="white"/>
    <line x1="$((size - padding * 2) * 0.38)" y1="$((size - padding * 2) * 0.7)"
          x2="$((size - padding * 2) * 0.62)" y2="$((size - padding * 2) * 0.7)"
          stroke="#00adad" stroke-width="$((size - padding * 2) * 0.015)"/>
  </g>
</svg>
EOF
}

generate_svg_maskable 192
generate_svg_maskable 512

# Generate smaller sizes
for size in 72 96 128 144 152 384; do
  generate_svg $size 0
done

echo "✅ All SVG icons generated!"
echo ""
echo "To convert to PNG, install imagemagick and run:"
echo "  sudo apt-get install imagemagick"
echo "  cd ${ICON_DIR} && for f in *.svg; do convert \$f \${f%.svg}.png; done"
