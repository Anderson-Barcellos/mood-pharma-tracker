/**
 * PWA Install Prompt Component
 * Shows a banner to prompt users to install the app on their device
 * Handles both iOS and Android install flows
 */

import { useEffect, useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    setIsInStandaloneMode(isStandalone);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = Math.floor((now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        setIsDismissed(true);
        return;
      }
    }

    // Listen for PWA install prompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show banner after 10 seconds of page load
      setTimeout(() => {
        if (!isStandalone && !isDismissed) {
          setIsVisible(true);
        }
      }, 10000);
    };

    // Listen for custom event from index.html
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-installable', ((e: CustomEvent) => {
      setDeferredPrompt(e.detail);
      setTimeout(() => {
        if (!isStandalone && !isDismissed) {
          setIsVisible(true);
        }
      }, 10000);
    }) as EventListener);

    // For iOS, show banner after 10 seconds if not installed and not dismissed
    if (iOS && !isStandalone && !isDismissed) {
      setTimeout(() => {
        setIsVisible(true);
      }, 10000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isInStandaloneMode, isDismissed]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // For iOS, just show instructions (can't programmatically install)
      return;
    }

    // Hide the banner
    setIsVisible(false);

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);

    // Store dismissed date
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  // Don't show if already installed or dismissed
  if (isInStandaloneMode || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md sm:left-auto sm:right-4"
          role="dialog"
          aria-labelledby="install-prompt-title"
          aria-describedby="install-prompt-description"
        >
          <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-[#00adad]/90 to-[#008a8a]/90 p-4 shadow-2xl backdrop-blur-xl">
            {/* Glassmorphic overlay */}
            <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-sm" />

            {/* Content */}
            <div className="relative">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute -right-2 -top-2 rounded-full bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
                aria-label="Dismiss install prompt"
              >
                <X size={16} />
              </button>

              {/* Icon and text */}
              <div className="flex items-start gap-3 pr-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                  <Download className="text-white" size={24} />
                </div>

                <div className="flex-1">
                  <h3 id="install-prompt-title" className="mb-1 font-semibold text-white">
                    Install MoodPharma
                  </h3>
                  <p id="install-prompt-description" className="mb-3 text-sm text-white/90">
                    {isIOS
                      ? 'Add to your home screen for quick access and offline use'
                      : 'Install the app for a better experience and offline access'}
                  </p>

                  {/* Instructions */}
                  {isIOS ? (
                    <div className="mb-3 rounded-lg bg-white/10 p-3 text-xs text-white/90 backdrop-blur-sm">
                      <p className="mb-2 font-medium">To install:</p>
                      <ol className="space-y-1">
                        <li className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20">
                            1
                          </span>
                          <span>
                            Tap the <Share size={14} className="mx-0.5 inline" /> Share button below
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20">
                            2
                          </span>
                          <span>
                            Select <Plus size={14} className="mx-0.5 inline" /> Add to Home Screen
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20">
                            3
                          </span>
                          <span>Tap Add</span>
                        </li>
                      </ol>
                    </div>
                  ) : (
                    <button
                      onClick={handleInstallClick}
                      className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#00adad] transition-all hover:scale-105 hover:shadow-lg active:scale-95"
                    >
                      Install App
                    </button>
                  )}

                  {/* Features */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
                    <span className="rounded-full bg-white/10 px-2 py-0.5 backdrop-blur-sm">
                      ⚡ Faster
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 backdrop-blur-sm">
                      📱 Home screen
                    </span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 backdrop-blur-sm">
                      🔒 Offline access
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to check PWA installation status
 */
export function usePWAInstallStatus() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone ||
                      document.referrer.includes('android-app://');

    setIsInstalled(standalone);

    // Listen for install prompt availability
    const handleBeforeInstallPrompt = () => {
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  return { isInstalled, isInstallable };
}
