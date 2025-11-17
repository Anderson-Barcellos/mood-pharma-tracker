import { saveToServer } from '@/core/services/server-data-loader';

type SyncReason =
  | 'medication:create'
  | 'medication:update'
  | 'medication:delete'
  | 'dose:create'
  | 'dose:update'
  | 'dose:delete'
  | 'mood:create'
  | 'mood:update'
  | 'mood:delete'
  | 'manual';

interface SyncState {
  timer?: ReturnType<typeof setTimeout>;
  inFlight: boolean;
  lastReason?: SyncReason;
}

const DEBOUNCE_MS = 1500;
const state: SyncState = {
  timer: undefined,
  inFlight: false,
  lastReason: undefined
};

function runSync(reason: SyncReason) {
  if (state.inFlight) {
    return;
  }

  state.inFlight = true;
  state.lastReason = reason;

  saveToServer()
    .catch((error) => {
      console.warn('[ServerSync] Failed to save data:', error);
    })
    .finally(() => {
      state.inFlight = false;
    });
}

/**
 * Schedules a sync with the server after a short debounce window.
 * Subsequent calls reset the timer to avoid excessive requests.
 */
export function scheduleServerSync(reason: SyncReason = 'manual'): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (state.timer) {
    clearTimeout(state.timer);
  }

  state.timer = setTimeout(() => {
    runSync(reason);
    state.timer = undefined;
  }, DEBOUNCE_MS);
}
