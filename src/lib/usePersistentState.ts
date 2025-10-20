import { useCallback, useEffect, useRef, useState } from 'react';

type Setter<T> = T | ((prev: T) => T);

const isBrowser = typeof window !== 'undefined';

function readFromStorage<T>(key: string): T | null {
  if (!isBrowser) return null;

  try {
    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null) return null;
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.warn(`Failed to read persisted state for key "${key}"`, error);
    return null;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (!isBrowser) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to persist state for key "${key}"`, error);
  }
}

export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: Setter<T>) => void] {
  const defaultRef = useRef(defaultValue);

  const [state, setState] = useState<T>(() => {
    const stored = readFromStorage<T>(key);
    if (stored === null || stored === undefined) {
      return defaultValue;
    }

    return stored;
  });

  useEffect(() => {
    defaultRef.current = defaultValue;
  }, [defaultValue]);

  useEffect(() => {
    writeToStorage(key, state);
  }, [key, state]);

  useEffect(() => {
    if (!isBrowser) return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;

      if (event.newValue === null) {
        setState(defaultRef.current);
        return;
      }

      try {
        setState(JSON.parse(event.newValue));
      } catch (error) {
        console.warn(`Failed to parse persisted state for key "${key}"`, error);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  const setValue = useCallback((value: Setter<T>) => {
    setState((previous) => {
      const base = previous ?? defaultRef.current;
      return typeof value === 'function' ? (value as (prev: T) => T)(base) : value;
    });
  }, []);

  return [state ?? defaultRef.current, setValue];
}
