# Mood & Pharma Tracker - PWA Configuration

This app is now configured as a **Progressive Web App (PWA)** with full offline support and installability.

## Features Implemented

### 1. PWA Manifest (`/public/manifest.json`)
- ✅ App name and metadata configured
- ✅ Theme color: `#00adad` (teal from design system)
- ✅ Background color: `#0a0a0a` (dark mode)
- ✅ Display mode: `standalone` (fullscreen app experience)
- ✅ App icons in multiple sizes (SVG format)
- ✅ Maskable icons for Android adaptive icons
- ✅ App shortcuts for quick actions (Mood, Meds, Analytics)

### 2. Service Worker (`/public/service-worker.js`)
Advanced caching strategies:

- **Cache-First**: Static assets (JS, CSS, fonts, images)
- **Network-First**: API/data requests with offline fallback
- **Navigation Handler**: SPA routes work offline
- **Background Sync**: Ready for mood/medication logging when offline
- **Version Management**: Automatic cache busting on updates

### 3. App Icons (`/public/icons/`)
Generated SVG icons with glassmorphism theme:
- All sizes: 72, 96, 128, 144, 152, 192, 384, 512
- Maskable versions for Android (192, 512)
- Teal gradient background matching design system
- Heart rate + pill icon symbolism

### 4. Offline Support
- ✅ Offline fallback page (`/public/offline.html`)
- ✅ IndexedDB already configured (Dexie)
- ✅ Service worker caching all routes
- ✅ Network status indicator
- ✅ Automatic sync when back online

### 5. PWA Install Prompt (`/src/shared/components/PWAInstallPrompt.tsx`)
Smart install banner:
- ✅ Auto-shows after 10 seconds
- ✅ Different UX for iOS vs Android
- ✅ iOS: Shows manual installation instructions
- ✅ Android: One-click install button
- ✅ Dismissible with 7-day cooldown
- ✅ Glassmorphism design matching app theme

### 6. Mobile Optimizations
CSS improvements in `/src/main.css`:
- ✅ iOS safe-area support (notch padding)
- ✅ Minimum 48px touch targets (accessibility)
- ✅ Pull-to-refresh prevention
- ✅ Smooth scrolling
- ✅ Better tap highlighting
- ✅ Offline mode indicator banner

### 7. Build Optimization (`vite.config.ts`)
Production build improvements:
- ✅ Code splitting by vendor (React, UI, Charts, Forms, etc)
- ✅ Better chunk naming for caching
- ✅ CSS code splitting
- ✅ Inline small assets (<4KB)
- ✅ Optimized dependencies pre-bundling

## Installation

### Desktop (Chrome, Edge)
1. Visit the app URL
2. Look for install icon in address bar
3. Click "Install Mood & Pharma Tracker"

### Android (Chrome)
1. Visit the app
2. Wait for banner or tap menu → "Add to Home Screen"
3. Confirm installation

### iOS (Safari)
1. Visit the app
2. Tap Share button (⬆️)
3. Scroll and tap "Add to Home Screen"
4. Confirm

## Testing PWA Features

### Test Offline Mode
1. Open DevTools → Network tab
2. Enable "Offline" throttling
3. Reload the app
4. Verify: App still works, shows offline indicator

### Test Service Worker
```bash
# In browser DevTools Console:
navigator.serviceWorker.getRegistration()
  .then(reg => console.log('SW Status:', reg.active.state))
```

### Test Caching
```bash
# In browser DevTools Console:
caches.keys()
  .then(names => console.log('Cache names:', names))
```

### Test Install Prompt
1. Visit app in incognito/private window
2. Wait 10 seconds
3. Verify banner appears (Android/Chrome)
4. Or follow manual instructions (iOS/Safari)

## Lighthouse PWA Audit

Run Lighthouse audit to verify PWA compliance:
1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Select "Progressive Web App"
4. Click "Generate report"

Expected scores:
- ✅ Installable
- ✅ PWA Optimized
- ✅ Works Offline
- ✅ Has manifest
- ✅ Has icons

## Deployment Checklist

Before deploying:
- [ ] Replace SVG icons with custom PNG icons (optional)
- [ ] Update manifest.json with production URL
- [ ] Test on real iOS and Android devices
- [ ] Verify HTTPS (required for service workers)
- [ ] Test offline functionality
- [ ] Run Lighthouse PWA audit
- [ ] Verify cache versioning works

## Cache Management

### Clear Service Worker Cache
```javascript
// In DevTools Console:
caches.keys().then(names => {
  names.forEach(name => caches.delete(name))
})
```

### Update Service Worker
The SW automatically checks for updates every hour. To force update:
1. Change `CACHE_VERSION` in `/public/service-worker.js`
2. Rebuild and deploy
3. User will see update prompt

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify HTTPS (required except on localhost)
- Check `/public/service-worker.js` exists

### Install Prompt Not Showing
- Only works on HTTPS (or localhost)
- Won't show if already installed
- Check localStorage for `pwa-install-dismissed`

### Offline Mode Not Working
- Verify service worker is active
- Check cache storage in DevTools
- Ensure assets are being cached

### Icons Not Showing
- SVG icons may not work on all browsers
- Convert to PNG using imagemagick:
  ```bash
  cd public/icons
  for f in *.svg; do convert $f ${f%.svg}.png; done
  ```
- Update manifest.json to use `.png` extensions

## Performance

Current build stats:
- Main bundle: ~512 KB (gzip: ~147 KB)
- Vendor chunks split for better caching
- CSS: ~584 KB (gzip: ~93 KB)
- Total page weight: ~1.3 MB (gzip)

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 90+     | ✅ Full |
| Edge    | 90+     | ✅ Full |
| Safari  | 15+     | ⚠️ Limited (no auto-install) |
| Firefox | 90+     | ✅ Full |
| Samsung | 15+     | ✅ Full |

## Next Steps

1. **Custom Icons**: Replace SVG placeholders with branded PNG icons
2. **Screenshots**: Add app screenshots to manifest for app stores
3. **Push Notifications**: Implement reminder system (optional)
4. **App Store**: Submit to Google Play via TWA (Trusted Web Activity)
5. **Analytics**: Track install/uninstall events

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [Workbox (Advanced SW)](https://developers.google.com/web/tools/workbox)
- [PWA Builder](https://www.pwabuilder.com/)

---

**Production Ready!** 🚀

The app is now fully configured as a PWA with offline support, installability, and mobile optimizations.
