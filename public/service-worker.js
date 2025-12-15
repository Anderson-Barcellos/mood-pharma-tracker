/**
 * Mood & Pharma Tracker - Service Worker
 * Progressive Web App with offline support
 */

const CACHE_VERSION = 'v1.2.0';
const CACHE_NAME = `moodpharma-${CACHE_VERSION}`;
const RUNTIME_CACHE = `moodpharma-runtime-${CACHE_VERSION}`;
const DATA_CACHE = `moodpharma-data-${CACHE_VERSION}`;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html', // Fallback page
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Routes that should work offline (SPA routes)
const OFFLINE_ROUTES = [
  '/',
  '/mood',
  '/medications',
  '/analytics',
  '/cognitive',
];

/**
 * Install Event - Cache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.error('[SW] Precache failed:', error);
        // Continue even if some assets fail to cache
        return Promise.resolve();
      });
    }).then(() => {
      // Skip waiting to activate immediately
      return self.skipWaiting();
    })
  );
});

/**
 * Activate Event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old cache versions
          if (cacheName.startsWith('moodpharma-') && cacheName !== CACHE_NAME && 
              cacheName !== RUNTIME_CACHE && cacheName !== DATA_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

/**
 * Fetch Event - Smart caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle different request types with appropriate strategies
  if (isAssetRequest(url)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request, DATA_CACHE));
  } else if (isNavigationRequest(request)) {
    event.respondWith(navigationHandler(request));
  } else {
    event.respondWith(runtimeCache(request));
  }
});

/**
 * Cache-First Strategy (for static assets)
 * Try cache first, fallback to network
 */
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Cache-first failed:', error);
    return new Response('Offline - Asset not cached', { status: 503 });
  }
}

/**
 * Network-First Strategy (for API/data requests)
 * Try network first, fallback to cache
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request, {
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return empty response for failed API calls
    return new Response(JSON.stringify({ offline: true, error: 'Network unavailable' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Navigation Handler (for SPA routes)
 * Always try network, fallback to cached index.html
 */
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Navigation offline, using cached page');
    
    // Try to return cached version
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Fallback to index.html (SPA will handle routing)
    const indexCached = await caches.match('/index.html');
    if (indexCached) {
      return indexCached;
    }

    // Last resort: offline page
    const offlineCached = await caches.match('/offline.html');
    if (offlineCached) {
      return offlineCached;
    }

    return new Response('Offline - Please connect to the internet', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Runtime Cache Strategy (for other requests)
 * Network-first with runtime caching
 */
async function runtimeCache(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

/**
 * Request Type Detectors
 */
function isAssetRequest(url) {
  const assetExtensions = ['.js', '.css', '.woff2', '.woff', '.ttf', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif'];
  return assetExtensions.some(ext => url.pathname.endsWith(ext));
}

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || url.pathname.includes('/graphql');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Background Sync - for dose/mood logging when offline
 */
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);

  if (event.tag === 'sync-mood-logs') {
    event.waitUntil(syncMoodLogs());
  } else if (event.tag === 'sync-medication-logs') {
    event.waitUntil(syncMedicationLogs());
  }
});

async function syncMoodLogs() {
  console.log('[SW] Syncing mood logs...');
  // IndexedDB sync would happen here
  // The app will handle this via Dexie
  return Promise.resolve();
}

async function syncMedicationLogs() {
  console.log('[SW] Syncing medication logs...');
  // IndexedDB sync would happen here
  // The app will handle this via Dexie
  return Promise.resolve();
}

/**
 * Message Handler - communicate with the app
 */
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
    });
  } else if (event.data.type === 'CLEAR_CACHE') {
    clearCache().then(() => {
      event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
    });
  }
});

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;

  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('moodpharma-')) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      totalSize += keys.length;
    }
  }

  return totalSize;
}

async function clearCache() {
  const cacheNames = await caches.keys();
  
  await Promise.all(
    cacheNames.map((cacheName) => {
      if (cacheName.startsWith('moodpharma-')) {
        return caches.delete(cacheName);
      }
    })
  );

  console.log('[SW] All caches cleared');
}

/**
 * Error Handler
 */
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');
