import { v4 as uuidv4 } from 'uuid';
import type { Medication } from '@/shared/types';

type MedicationDraft = Partial<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>> & {
  id?: string;
  createdAt?: number;
  updatedAt?: number;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const DEFAULT_RANGE_UNIT = 'ng/mL';
const DEFAULT_ABSORPTION_RATE = 1;

function deriveTherapeuticRange(source: Partial<Medication>): Medication['therapeuticRange'] | undefined {
  const fromObject = source.therapeuticRange;
  const minFromObject = fromObject?.min;
  const maxFromObject = fromObject?.max;
  const minFromFields = source.therapeuticRangeMin;
  const maxFromFields = source.therapeuticRangeMax;
  const unit = fromObject?.unit ?? source.therapeuticRangeUnit ?? DEFAULT_RANGE_UNIT;

  if (isFiniteNumber(minFromObject) && isFiniteNumber(maxFromObject)) {
    const low = Math.min(minFromObject, maxFromObject);
    const high = Math.max(minFromObject, maxFromObject);
    return { min: low, max: high, unit };
  }

  if (isFiniteNumber(minFromFields) && isFiniteNumber(maxFromFields)) {
    const low = Math.min(minFromFields, maxFromFields);
    const high = Math.max(minFromFields, maxFromFields);
    return { min: low, max: high, unit };
  }

  return undefined;
}

function syncTherapeuticRangeFields<T extends Partial<Medication>>(target: T, source: Partial<Medication>): T {
  const range = deriveTherapeuticRange(source);

  if (range) {
    target.therapeuticRange = range;
    target.therapeuticRangeMin = range.min;
    target.therapeuticRangeMax = range.max;
    target.therapeuticRangeUnit = range.unit;
    return target;
  }

  if ('therapeuticRange' in source) {
    target.therapeuticRange = source.therapeuticRange;
  }
  if ('therapeuticRangeMin' in source) {
    target.therapeuticRangeMin = source.therapeuticRangeMin;
  }
  if ('therapeuticRangeMax' in source) {
    target.therapeuticRangeMax = source.therapeuticRangeMax;
  }
  if ('therapeuticRangeUnit' in source) {
    target.therapeuticRangeUnit = source.therapeuticRangeUnit;
  }

  return target;
}

function normalizeCoreFields(record: Medication, now: number): Medication {
  const normalized: Medication = {
    ...record,
    genericName: record.genericName ?? record.name,
    category: record.category ?? record.class,
    class: record.class ?? record.category,
    absorptionRate: isFiniteNumber(record.absorptionRate) ? record.absorptionRate : DEFAULT_ABSORPTION_RATE,
    createdAt: record.createdAt ?? now,
    updatedAt: record.updatedAt ?? record.createdAt ?? now
  };

  if (normalized.defaultDose !== undefined && normalized.unit === undefined) {
    normalized.unit = 'mg';
  }

  syncTherapeuticRangeFields(normalized, normalized);

  return normalized;
}

export function createMedicationRecord(payload: MedicationDraft, timestamp: number = Date.now()): Medication {
  if (!payload.name) {
    throw new Error('Medication name is required');
  }
  if (!isFiniteNumber(payload.halfLife)) {
    throw new Error('Medication halfLife is required');
  }
  if (!isFiniteNumber(payload.volumeOfDistribution)) {
    throw new Error('Medication volumeOfDistribution is required');
  }
  if (!isFiniteNumber(payload.bioavailability)) {
    throw new Error('Medication bioavailability is required');
  }

  const record: Medication = {
    id: payload.id ?? uuidv4(),
    name: payload.name,
    brandName: payload.brandName,
    genericName: payload.genericName,
    category: payload.category,
    class: payload.class,
    defaultDose: payload.defaultDose,
    unit: payload.unit,
    color: payload.color,
    halfLife: payload.halfLife,
    volumeOfDistribution: payload.volumeOfDistribution,
    bioavailability: payload.bioavailability,
    absorptionRate: isFiniteNumber(payload.absorptionRate) ? payload.absorptionRate : DEFAULT_ABSORPTION_RATE,
    therapeuticRange: payload.therapeuticRange,
    therapeuticRangeMin: payload.therapeuticRangeMin,
    therapeuticRangeMax: payload.therapeuticRangeMax,
    therapeuticRangeUnit: payload.therapeuticRangeUnit,
    notes: payload.notes,
    createdAt: payload.createdAt ?? timestamp,
    updatedAt: payload.updatedAt ?? timestamp
  };

  return normalizeCoreFields(record, timestamp);
}

export function mergeMedicationRecord(existing: Medication, updates: MedicationDraft, timestamp: number = Date.now()): Medication {
  const merged: Medication = {
    ...existing,
    ...updates,
    genericName: updates.genericName ?? existing.genericName ?? existing.name,
    category: updates.category ?? updates.class ?? existing.category,
    class: updates.class ?? updates.category ?? existing.class,
    absorptionRate: isFiniteNumber(updates.absorptionRate)
      ? updates.absorptionRate
      : existing.absorptionRate ?? DEFAULT_ABSORPTION_RATE,
    updatedAt: updates.updatedAt ?? timestamp
  };

  if (updates.unit !== undefined) {
    merged.unit = updates.unit;
  } else if (updates.defaultDose !== undefined && merged.unit === undefined) {
    merged.unit = 'mg';
  }

  syncTherapeuticRangeFields(merged, { ...existing, ...updates });

  return normalizeCoreFields(merged, timestamp);
}

export function normalizeMedicationRecord(record: Medication, timestamp: number = Date.now()): Medication {
  return normalizeCoreFields(record, timestamp);
}

export type { MedicationDraft };
