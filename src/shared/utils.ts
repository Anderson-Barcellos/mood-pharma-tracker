import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as dateFnsFormat } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeFormat(timestamp: number | undefined | null, formatStr: string, fallback: string = 'Invalid date'): string {
  if (timestamp === undefined || timestamp === null || isNaN(timestamp) || timestamp <= 0) {
    return fallback;
  }
  
  try {
    return dateFnsFormat(timestamp, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error, 'timestamp:', timestamp);
    return fallback;
  }
}
