import { useCallback, useEffect, useRef, useState } from 'react';

type Listener<T> = (value: T | undefined) => void;

const listeners = new Map<string, Set<Listener<unknown>>>();

function getStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[storage] localStorage unavailable', error);
    return undefined;
  }
}

function safeParse<T>(raw: string | null): T | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('[storage] failed to parse value', error);
    return undefined;
  }
}

function notifyListeners<T>(key: string, value: T | undefined) {
  const keyListeners = listeners.get(key);
  if (!keyListeners) {
    return;
  }
  for (const listener of keyListeners) {
    try {
      (listener as Listener<T>)(value);
    } catch (error) {
      console.error('[storage] listener execution failed', error);
    }
  }
}

export function getStoredValue<T>(key: string): T | undefined {
  const storage = getStorage();
  if (!storage) {
    return undefined;
  }
  const raw = storage.getItem(key);
  return safeParse<T>(raw);
}

export function setStoredValue<T>(key: string, value: T | undefined): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    if (value === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    console.error('[storage] failed to persist value', error);
  }

  notifyListeners(key, value);
}

function subscribe<T>(key: string, listener: Listener<T>): () => void {
  let keyListeners = listeners.get(key);
  if (!keyListeners) {
    keyListeners = new Set();
    listeners.set(key, keyListeners);
  }

  keyListeners.add(listener as Listener<unknown>);

  return () => {
    const existing = listeners.get(key);
    if (!existing) {
      return;
    }
    existing.delete(listener as Listener<unknown>);
    if (existing.size === 0) {
      listeners.delete(key);
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key) {
      return;
    }
    const parsed = safeParse<unknown>(event.newValue);
    notifyListeners(event.key, parsed);
  });
}

export function usePersistentState<T>(key: string, defaultValue: T) {
  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  const [value, setValue] = useState<T>(defaultValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const stored = getStoredValue<T>(key);
    if (stored !== undefined) {
      setValue(stored);
    } else {
      setValue(defaultRef.current);
    }
    setIsReady(true);

    return subscribe<T>(key, (next) => {
      if (next === undefined) {
        setValue(defaultRef.current);
      } else {
        setValue(next);
      }
    });
  }, [key]);

  const updateValue = useCallback((updater: T | ((prev: T) => T)) => {
    setValue((previous) => {
      const nextValue = typeof updater === 'function'
        ? (updater as (prev: T) => T)(previous)
        : updater;
      setStoredValue(key, nextValue);
      return nextValue;
    });
  }, [key]);

  return { value, setValue: updateValue, isReady } as const;
}
