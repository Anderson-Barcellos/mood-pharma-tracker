import type { Medication, MedicationDose } from '@/shared/types';
import { calculateConcentration } from './pharmacokinetics';

// Increment CACHE_VERSION when pharmacokinetic formula changes
const CACHE_VERSION = 2; // v2: Fixed ln(2) + two-compartment model

interface CacheKey {
  medicationId: string;
  doseIds: string;
  targetTime: number;
  bodyWeight: number;
  version: number;
}

interface CacheEntry {
  concentration: number;
  timestamp: number;
  version: number;
}

interface CurveCacheEntry {
  curve: Array<{ time: number; concentration: number }>;
  timestamp: number;
  version: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

class PharmacokineticCache {
  private concentrationCache = new Map<string, CacheEntry>();
  private curveCache = new Map<string, CurveCacheEntry>();
  private accessOrder: string[] = [];

  private getCacheKey(
    medicationId: string,
    doses: MedicationDose[],
    targetTime: number,
    bodyWeight: number
  ): string {
    const sortedDoseIds = doses
      .map(d => `${d.id}:${d.timestamp}:${d.doseAmount}`)
      .sort()
      .join('|');

    const timeKey = Math.floor(targetTime / 60000);
    return `v${CACHE_VERSION}:${medicationId}:${sortedDoseIds}:${timeKey}:${bodyWeight}`;
  }

  private getCurveKey(
    medicationId: string,
    doses: MedicationDose[],
    startTime: number,
    endTime: number,
    points: number,
    bodyWeight: number
  ): string {
    const sortedDoseIds = doses
      .map(d => `${d.id}:${d.timestamp}:${d.doseAmount}`)
      .sort()
      .join('|');

    const startKey = Math.floor(startTime / 60000);
    const endKey = Math.floor(endTime / 60000);
    return `v${CACHE_VERSION}:curve:${medicationId}:${sortedDoseIds}:${startKey}:${endKey}:${points}:${bodyWeight}`;
  }

  private evictOldestEntry(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift();
    if (oldestKey) {
      this.concentrationCache.delete(oldestKey);
      this.curveCache.delete(oldestKey);
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    if (this.accessOrder.length > MAX_CACHE_SIZE) {
      this.evictOldestEntry();
    }
  }

  getConcentration(
    medication: Medication,
    doses: MedicationDose[],
    targetTime: number,
    bodyWeight: number = 70
  ): number {
    const key = this.getCacheKey(medication.id, doses, targetTime, bodyWeight);
    const cached = this.concentrationCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      this.updateAccessOrder(key);
      return cached.concentration;
    }

    const concentration = calculateConcentration(medication, doses, targetTime, bodyWeight);

    this.concentrationCache.set(key, {
      concentration,
      timestamp: Date.now(),
      version: CACHE_VERSION
    });

    this.updateAccessOrder(key);

    return concentration;
  }

  getCurve(
    medication: Medication,
    doses: MedicationDose[],
    startTime: number,
    endTime: number,
    points: number = 100,
    bodyWeight: number = 70
  ): Array<{ time: number; concentration: number }> {
    const key = this.getCurveKey(
      medication.id,
      doses,
      startTime,
      endTime,
      points,
      bodyWeight
    );

    const cached = this.curveCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      this.updateAccessOrder(key);
      return cached.curve;
    }

    const curve: Array<{ time: number; concentration: number }> = [];
    const interval = (endTime - startTime) / points;

    for (let i = 0; i <= points; i++) {
      const time = startTime + (i * interval);
      const concentration = this.getConcentration(medication, doses, time, bodyWeight);
      curve.push({ time, concentration });
    }

    this.curveCache.set(key, {
      curve,
      timestamp: Date.now(),
      version: CACHE_VERSION
    });

    this.updateAccessOrder(key);

    return curve;
  }

  invalidate(medicationId?: string): void {
    if (!medicationId) {
      this.concentrationCache.clear();
      this.curveCache.clear();
      this.accessOrder = [];
      return;
    }

    const keysToDelete: string[] = [];

    this.concentrationCache.forEach((_, key) => {
      if (key.startsWith(medicationId) || key.startsWith(`curve:${medicationId}`)) {
        keysToDelete.push(key);
      }
    });

    this.curveCache.forEach((_, key) => {
      if (key.startsWith(medicationId) || key.startsWith(`curve:${medicationId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.concentrationCache.delete(key);
      this.curveCache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });
  }

  getStats() {
    return {
      concentrationCacheSize: this.concentrationCache.size,
      curveCacheSize: this.curveCache.size,
      totalCacheSize: this.concentrationCache.size + this.curveCache.size,
      accessOrderLength: this.accessOrder.length
    };
  }

  clearExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.concentrationCache.forEach((entry, key) => {
      if (now - entry.timestamp >= CACHE_TTL) {
        expiredKeys.push(key);
      }
    });

    this.curveCache.forEach((entry, key) => {
      if (now - entry.timestamp >= CACHE_TTL) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.concentrationCache.delete(key);
      this.curveCache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });
  }
}

export const pkCache = new PharmacokineticCache();

setInterval(() => {
  pkCache.clearExpiredEntries();
}, 60000);
