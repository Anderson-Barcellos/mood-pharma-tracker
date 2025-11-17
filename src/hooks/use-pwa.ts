/**
 * PWA Detection and Utilities Hook
 * Provides utilities for PWA-specific functionality
 */

import { useEffect, useState } from 'react';

interface PWAStatus {
  isInstalled: boolean;
  isStandalone: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  canInstall: boolean;
}

export function usePWA(): PWAStatus {
  const [status, setStatus] = useState<PWAStatus>({
    isInstalled: false,
    isStandalone: false,
    isInstallable: false,
    isOnline: navigator.onLine,
    platform: 'unknown',
    canInstall: false,
  });

  useEffect(() => {
    // Detect platform
    const detectPlatform = (): 'ios' | 'android' | 'desktop' | 'unknown' => {
      const userAgent = navigator.userAgent.toLowerCase();

      if (/iphone|ipad|ipod/.test(userAgent)) {
        return 'ios';
      } else if (/android/.test(userAgent)) {
        return 'android';
      } else if (/windows|macintosh|linux/.test(userAgent)) {
        return 'desktop';
      }

      return 'unknown';
    };

    // Check if running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    // Check if app is installed
    const isInstalled = isStandalone;

    const platform = detectPlatform();

    setStatus((prev) => ({
      ...prev,
      isStandalone,
      isInstalled,
      platform,
    }));

    // Listen for install prompt
    const handleBeforeInstallPrompt = () => {
      setStatus((prev) => ({
        ...prev,
        isInstallable: true,
        canInstall: !isInstalled,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setStatus((prev) => ({
        ...prev,
        isInstalled: true,
        canInstall: false,
      }));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return status;
}

/**
 * Hook to detect if device supports vibration (haptic feedback)
 */
export function useHapticFeedback() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('vibrate' in navigator);
  }, []);

  const vibrate = (pattern: number | number[] = 10) => {
    if (isSupported && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  return { isSupported, vibrate };
}

/**
 * Hook to detect network connection type and speed
 */
export function useNetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState({
    isOnline: navigator.onLine,
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      if (connection) {
        setNetworkInfo({
          isOnline: navigator.onLine,
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 50,
          saveData: connection.saveData || false,
        });
      } else {
        setNetworkInfo((prev) => ({
          ...prev,
          isOnline: navigator.onLine,
        }));
      }
    };

    const handleOnline = () => updateNetworkInfo();
    const handleOffline = () => updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for connection changes
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    updateNetworkInfo();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return networkInfo;
}

/**
 * Hook to manage service worker updates
 */
export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { updateAvailable, updateServiceWorker };
}

/**
 * Hook to check if the app should use reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to detect dark mode preference
 */
export function usePrefersDarkMode(): boolean {
  const [prefersDarkMode, setPrefersDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersDarkMode;
}
