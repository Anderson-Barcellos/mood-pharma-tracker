import { useCallback } from 'react';

/**
 * Haptic feedback types for mobile devices
 * Uses the Vibration API with different patterns
 */
type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotificationStyle = 'success' | 'warning' | 'error';

interface HapticFeedback {
  /**
   * Trigger impact haptic feedback
   * @param style - The intensity of the haptic feedback
   */
  impact: (style: HapticImpactStyle) => void;

  /**
   * Trigger notification haptic feedback
   * @param style - The type of notification
   */
  notification: (style: HapticNotificationStyle) => void;

  /**
   * Trigger selection changed haptic feedback
   * Light tap for slider/picker changes
   */
  selection: () => void;

  /**
   * Check if haptic feedback is supported
   */
  isSupported: boolean;
}

/**
 * Vibration patterns for different haptic styles
 * Each array represents [duration, pause, duration, pause, ...]
 */
const HAPTIC_PATTERNS = {
  // Impact styles
  light: [10],
  medium: [20],
  heavy: [30],
  rigid: [15, 5, 15],
  soft: [5, 10, 5],

  // Notification styles
  success: [10, 50, 10],
  warning: [20, 50, 20, 50, 20],
  error: [30, 100, 30],

  // Selection
  selection: [5]
} as const;

/**
 * Custom hook for haptic feedback on mobile devices
 *
 * Usage:
 * ```tsx
 * const haptic = useHaptic();
 *
 * // Light tap on button press
 * <Button onClick={() => {
 *   haptic.impact('light');
 *   handleClick();
 * }}>Click me</Button>
 *
 * // Success feedback after save
 * const handleSave = async () => {
 *   await saveData();
 *   haptic.notification('success');
 * }
 *
 * // Selection feedback on slider change
 * <Slider onValueChange={(val) => {
 *   setValue(val);
 *   haptic.selection();
 * }} />
 * ```
 */
export function useHaptic(): HapticFeedback {
  // Check if Vibration API is supported
  const isSupported = typeof window !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | readonly number[]) => {
    if (!isSupported) return;

    try {
      // Convert readonly array to mutable array
      navigator.vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
    } catch (error) {
      // Silently fail if vibration is not available
      console.debug('Haptic feedback not available:', error);
    }
  }, [isSupported]);

  const impact = useCallback((style: HapticImpactStyle) => {
    vibrate(HAPTIC_PATTERNS[style]);
  }, [vibrate]);

  const notification = useCallback((style: HapticNotificationStyle) => {
    vibrate(HAPTIC_PATTERNS[style]);
  }, [vibrate]);

  const selection = useCallback(() => {
    vibrate(HAPTIC_PATTERNS.selection);
  }, [vibrate]);

  return {
    impact,
    notification,
    selection,
    isSupported
  };
}

/**
 * iOS-specific haptic feedback (requires WebKit)
 * Falls back to standard vibration if not on iOS
 */
export function useIOSHaptic(): HapticFeedback {
  const standardHaptic = useHaptic();

  // Check if running on iOS with WebKit
  const isIOS = typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent);

  const impact = useCallback((style: HapticImpactStyle) => {
    if (isIOS && (window as any).webkit?.messageHandlers?.hapticFeedback) {
      // iOS native haptic feedback
      try {
        (window as any).webkit.messageHandlers.hapticFeedback.postMessage({
          type: 'impact',
          style
        });
      } catch (error) {
        // Fallback to standard vibration
        standardHaptic.impact(style);
      }
    } else {
      standardHaptic.impact(style);
    }
  }, [isIOS, standardHaptic]);

  const notification = useCallback((style: HapticNotificationStyle) => {
    if (isIOS && (window as any).webkit?.messageHandlers?.hapticFeedback) {
      try {
        (window as any).webkit.messageHandlers.hapticFeedback.postMessage({
          type: 'notification',
          style
        });
      } catch (error) {
        standardHaptic.notification(style);
      }
    } else {
      standardHaptic.notification(style);
    }
  }, [isIOS, standardHaptic]);

  const selection = useCallback(() => {
    if (isIOS && (window as any).webkit?.messageHandlers?.hapticFeedback) {
      try {
        (window as any).webkit.messageHandlers.hapticFeedback.postMessage({
          type: 'selection'
        });
      } catch (error) {
        standardHaptic.selection();
      }
    } else {
      standardHaptic.selection();
    }
  }, [isIOS, standardHaptic]);

  return {
    impact,
    notification,
    selection,
    isSupported: standardHaptic.isSupported || isIOS
  };
}
