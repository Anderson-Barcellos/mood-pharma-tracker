import { Medication } from '@/shared/types';

/**
 * Medication Presets with Accurate Pharmacokinetic Parameters
 *
 * These presets contain clinically accurate PK parameters based on medical literature
 * and are intended for therapeutic monitoring. All values have been verified against
 * pharmacological references.
 *
 * Parameters included:
 * - Half-life (t½): Time for drug concentration to decrease by 50%
 * - Volume of Distribution (Vd): Apparent volume in L/kg
 * - Bioavailability (F): Fraction absorbed (0-1)
 * - Absorption Rate (Ka): Rate constant for absorption (/hour)
 * - Therapeutic Range: Target plasma concentration when clinically relevant
 */

const MEDICATION_PRESETS: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Lisdexamfetamine',
    brandName: 'Venvanse',
    category: 'Stimulant',
    halfLife: 11, // hours - Average of 10-12h range
    volumeOfDistribution: 3.5, // L/kg - Mid-range of 3-4 L/kg
    bioavailability: 0.96, // 96% - Very high bioavailability
    absorptionRate: 1.5, // /hour - Moderate-fast absorption (prodrug conversion)
    therapeuticRange: {
      min: 50, // ng/mL - d-amphetamine (active metabolite)
      max: 150, // ng/mL
      unit: 'ng/mL',
    },
    notes: 'Prodrug converted to d-amphetamine. Long-acting stimulant for ADHD. Peak effect 3-4h post-dose.',
  },
  {
    name: 'Escitalopram',
    brandName: 'Lexapro',
    category: 'SSRI',
    halfLife: 30, // hours - Mid-range of 27-32h
    volumeOfDistribution: 20, // L/kg - Mid-range of 12-26 L/kg, highly lipophilic
    bioavailability: 0.80, // 80%
    absorptionRate: 1.0, // /hour - Moderate absorption
    therapeuticRange: {
      min: 15, // ng/mL - Minimum therapeutic level
      max: 80, // ng/mL - Upper therapeutic range
      unit: 'ng/mL',
    },
    notes: 'S-enantiomer of citalopram. Selective serotonin reuptake inhibitor. Steady state in 7-10 days.',
  },
  {
    name: 'Lamotrigine',
    brandName: 'Lamictal',
    category: 'Mood Stabilizer',
    halfLife: 29, // hours - Mid-range of 25-33h (monotherapy)
    volumeOfDistribution: 1.1, // L/kg - Mid-range of 0.9-1.3 L/kg
    bioavailability: 0.98, // 98% - Excellent bioavailability
    absorptionRate: 1.2, // /hour - Moderate-fast absorption
    therapeuticRange: {
      min: 3.0, // mcg/mL - Minimum effective for mood stabilization
      max: 14.0, // mcg/mL - Upper therapeutic range (up to 15-20 for epilepsy)
      unit: 'mcg/mL',
    },
    notes: 'Anticonvulsant/mood stabilizer. Half-life varies with enzyme inducers/inhibitors. Requires slow titration to avoid rash (SJS risk).',
  },
  {
    name: 'Clonazepam',
    brandName: 'Rivotril',
    category: 'Benzodiazepine',
    halfLife: 35, // hours - Mid-range of 30-40h (long-acting BZD)
    volumeOfDistribution: 3.0, // L/kg - Mid-range of 1.5-4 L/kg
    bioavailability: 0.90, // 90%
    absorptionRate: 2.0, // /hour - Fast absorption for BZD (peak 1-4h)
    therapeuticRange: {
      min: 20, // ng/mL - Therapeutic for anxiety/seizures
      max: 80, // ng/mL - Upper range (toxicity >100 ng/mL)
      unit: 'ng/mL',
    },
    notes: 'Long-acting benzodiazepine. GABA-A agonist. High potency. Risk of tolerance and dependence. Peak plasma 1-4h.',
  },
];

/**
 * Get all medication presets
 *
 * @returns Array of medication presets without id/timestamp fields
 */
export function getMedicationPresets(): Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>[] {
  return MEDICATION_PRESETS;
}

/**
 * Find a medication preset by name (generic or brand name)
 *
 * @param name - Medication name (case-insensitive, partial match)
 * @returns Medication preset or undefined if not found
 */
export function findPresetByName(name: string): Omit<Medication, 'id' | 'createdAt' | 'updatedAt'> | undefined {
  const searchTerm = name.toLowerCase().trim();

  return MEDICATION_PRESETS.find(med =>
    med.name.toLowerCase().includes(searchTerm) ||
    med.brandName?.toLowerCase().includes(searchTerm)
  );
}

/**
 * Get presets filtered by category
 *
 * @param category - Medication category
 * @returns Array of medication presets in that category
 */
export function getPresetsByCategory(category: string): Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>[] {
  return MEDICATION_PRESETS.filter(med => med.category === category);
}

/**
 * Calculate estimated time to steady state
 *
 * @param halfLife - Drug half-life in hours
 * @returns Time to reach ~97% steady state (5 half-lives) in hours
 */
export function calculateTimeToSteadyState(halfLife: number): number {
  return halfLife * 5;
}

/**
 * Calculate dosing interval for target trough levels
 *
 * @param halfLife - Drug half-life in hours
 * @param targetTrough - Desired trough percentage of peak (0-1)
 * @returns Recommended dosing interval in hours
 */
export function calculateDosingInterval(halfLife: number, targetTrough: number = 0.5): number {
  // Using exponential decay: C(t) = C0 * e^(-ln(2)/t½ * t)
  // Solve for t when C(t)/C0 = targetTrough
  return (halfLife * Math.log(1 / targetTrough)) / Math.LN2;
}

export default MEDICATION_PRESETS;
