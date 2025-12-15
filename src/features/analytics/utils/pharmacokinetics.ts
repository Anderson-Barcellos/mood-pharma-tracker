import type { Medication, MedicationDose } from '@/shared/types';
import { perfMonitor } from './performance-monitor';

const DEBUG_PK = false;

function debugLog(message: string, data?: any) {
  if (DEBUG_PK) {
    console.log(`[PK Debug] ${message}`, data || '');
  }
}

const KA_BY_CLASS: Record<string, number> = {
  'SSRI': 0.7,
  'SNRI': 0.8,
  'Stimulant': 2.0,
  'Benzodiazepine': 1.5,
  'Antipsychotic': 0.5,
  'Mood Stabilizer': 0.6,
  'Other': 1.0,
};

// Effect compartment equilibration rate constants (ke0) by drug class
// Based on PK/PD literature for CNS drugs
// Higher ke0 = faster equilibration between plasma and effect site
const KE0_BY_CLASS: Record<string, number> = {
  'Stimulant': 2.0,        // Fast: ~30min to equilibrium (methylphenidate, amphetamines)
  'Benzodiazepine': 0.8,   // Moderate: ~1h (alprazolam, clonazepam)
  'SSRI': 0.15,            // Slow: ~4-6h for acute anxiolytic effects
  'SNRI': 0.2,             // Slow: similar to SSRI
  'Antipsychotic': 0.3,    // Moderate-slow: ~2-3h
  'Mood Stabilizer': 0.2,  // Slow: ~3-5h
  'Nootropic': 1.0,        // Variable, default moderate
  'Amino Acid': 1.5,       // Fast absorption, moderate effect onset
  'Other': 0.5,            // Default moderate
};

// Effect lag by drug class (additional fixed delay before effect compartment model kicks in)
const EFFECT_LAG_BY_CLASS: Record<string, number> = {
  'Stimulant': 0.25,       // ~15min prodrug conversion (lisdexamfetamine)
  'Benzodiazepine': 0.25,  // ~15min for CNS penetration
  'SSRI': 0.5,             // ~30min absorption
  'SNRI': 0.5,
  'Antipsychotic': 0.5,
  'Mood Stabilizer': 1.0,  // ~1h for slow absorbers
  'Other': 0.25,
};

const AUTOINDUCTION_DRUGS = ['lamotrigine', 'lamictal', 'lamotrigina'];
const AUTOINDUCTION_DAYS_TO_FULL_EFFECT = 21;
const AUTOINDUCTION_HALF_LIFE_REDUCTION = 0.20;

export function getAdjustedHalfLife(
  medication: Medication,
  doses: MedicationDose[]
): number {
  const baseName = (medication.name || '').toLowerCase();
  const genericName = (medication.genericName || '').toLowerCase();
  
  const isAutoinducer = AUTOINDUCTION_DRUGS.some(
    drug => baseName.includes(drug) || genericName.includes(drug)
  );
  
  if (!isAutoinducer) {
    return medication.halfLife;
  }
  
  const medDoses = doses.filter(d => d.medicationId === medication.id);
  if (medDoses.length === 0) {
    return medication.halfLife;
  }
  
  const firstDoseTime = Math.min(...medDoses.map(d => d.timestamp));
  const daysSinceFirstDose = (Date.now() - firstDoseTime) / (1000 * 60 * 60 * 24);
  
  if (daysSinceFirstDose < 7) {
    return medication.halfLife;
  }
  
  const inductionProgress = Math.min(1, daysSinceFirstDose / AUTOINDUCTION_DAYS_TO_FULL_EFFECT);
  const reductionFactor = 1 - (AUTOINDUCTION_HALF_LIFE_REDUCTION * inductionProgress);
  
  return medication.halfLife * reductionFactor;
}

export function getKaForMedication(medication: Medication, Ke: number): number {
  if (Number.isFinite(medication.absorptionRate) && medication.absorptionRate > 0) {
    return medication.absorptionRate;
  }
  const medClass = medication.class || medication.category || 'Other';
  const classKa = KA_BY_CLASS[medClass];
  if (classKa) return classKa;
  return Math.max(Ke * 3, 0.5);
}

export function calculateTmax(Ka: number, Ke: number): number {
  if (Ka <= Ke || !Number.isFinite(Ka) || !Number.isFinite(Ke)) return 1;
  return Math.log(Ka / Ke) / (Ka - Ke);
}

export function calculateAccumulationFactor(Ke: number, dosingInterval: number): number {
  const term = Math.exp(-Ke * dosingInterval);
  if (term >= 1) return 1;
  return 1 / (1 - term);
}

export function calculateConcentration(
  medication: Medication,
  doses: MedicationDose[],
  targetTime: number,
  bodyWeight: number = 70
): number {
  const MG_PER_L_TO_NG_PER_ML = 1000;

  return perfMonitor.measure(
    'calculateConcentration',
    () => {
      const { halfLife, volumeOfDistribution, bioavailability } = medication;

      if (!Number.isFinite(halfLife) || halfLife <= 0) return 0;
      if (!Number.isFinite(volumeOfDistribution) || volumeOfDistribution <= 0) return 0;
      if (!Number.isFinite(bioavailability) || bioavailability <= 0) return 0;

      const Ke = Math.LN2 / halfLife;
      let Ka = getKaForMedication(medication, Ke);

      if (Math.abs(Ka - Ke) < 1e-6) Ka = Ke + 1e-3;

      const Vd = volumeOfDistribution * bodyWeight; // L
      const F = bioavailability; // fraction [0..1]

      // Decide between one-compartment vs two-compartment model
      // Two-compartment for highly distributed drugs (Vd > 10 L/kg)
      const useTwoCompartment = volumeOfDistribution > 10;

      const Tmax = calculateTmax(Ka, Ke);
      const medClass = medication.class || medication.category || 'Other';

      debugLog(`Medication: ${medication.name}`, {
        class: medClass,
        halfLife,
        Ke: Ke.toFixed(4),
        Ka: Ka.toFixed(4),
        Tmax: Tmax.toFixed(2) + 'h',
        Vd,
        F,
        useTwoCompartment,
        bodyWeight
      });

      let totalConcentration = 0;

      for (const dose of doses) {
        if (dose.timestamp > targetTime) continue;

        const timeSinceDose = (targetTime - dose.timestamp) / (1000 * 3600);
        const D = dose.doseAmount;

        if (timeSinceDose < 0) continue;

        let concentration = 0;

        if (useTwoCompartment) {
          // Two-compartment model for drugs with extensive tissue distribution
          // Simulates distribution phase (fast alpha) + elimination phase (slow beta)
          //
          // C(t) = A * e^(-α*t) + B * e^(-β*t)
          //
          // Where:
          // - α (alpha) ≈ 3 * Ke (rapid distribution into tissues)
          // - β (beta) = Ke (terminal elimination)
          // - A/B ratio reflects distribution: higher Vd → larger B (prolonged elimination)

          const alpha = Math.min(Ka, 3 * Ke); // Distribution rate (fast)
          const beta = Ke; // Elimination rate (slow)

          // Coefficient ratio based on Vd (higher Vd → more in peripheral compartment)
          const peripheralFraction = Math.min(volumeOfDistribution / 20, 0.7); // Cap at 70%
          const A = (F * D * Ka) / (Vd * (Ka - alpha)) * (1 - peripheralFraction);
          const B = (F * D * Ka) / (Vd * (Ka - beta)) * peripheralFraction;

          concentration =
            A * (Math.exp(-alpha * timeSinceDose) - Math.exp(-Ka * timeSinceDose)) +
            B * (Math.exp(-beta * timeSinceDose) - Math.exp(-Ka * timeSinceDose));

        } else {
          // One-compartment model (simpler, for most drugs)
          // C(t) = (F * D * Ka) / (Vd * (Ka - Ke)) * (e^{-Ke t} - e^{-Ka t})
          const denom = Vd * (Ka - Ke);
          if (!Number.isFinite(denom) || denom === 0) continue;

          concentration = (F * D * Ka) / denom *
            (Math.exp(-Ke * timeSinceDose) - Math.exp(-Ka * timeSinceDose));
        }

        totalConcentration += Math.max(0, concentration);
      }

      const finalConcentration = totalConcentration * MG_PER_L_TO_NG_PER_ML;

      debugLog(`Final concentration for ${medication.name}`, {
        totalConcentration_mgL: totalConcentration.toFixed(4),
        finalConcentration_ngmL: finalConcentration.toFixed(2),
        doseCount: doses.length
      });

      return finalConcentration;
    },
    {
      medicationId: medication.id,
      doseCount: doses.length,
      bodyWeight
    }
  );
}

export function generateConcentrationCurve(
  medication: Medication,
  doses: MedicationDose[],
  startTime: number,
  endTime: number,
  points: number = 100,
  bodyWeight: number = 70
): Array<{ time: number; concentration: number }> {
  return perfMonitor.measure(
    'generateConcentrationCurve',
    () => {
      const curve: Array<{ time: number; concentration: number }> = [];
      const interval = (endTime - startTime) / points;

      for (let i = 0; i <= points; i++) {
        const time = startTime + (i * interval);
        const concentration = calculateConcentration(medication, doses, time, bodyWeight);
        curve.push({ time, concentration });
      }

      return curve;
    },
    {
      medicationId: medication.id,
      points,
      doseCount: doses.length,
      timeRange: endTime - startTime
    }
  );
}

export interface PKMetrics {
  Ka: number;
  Ke: number;
  Tmax: number;
  halfLife: number;
  medClass: string;
  useTwoCompartment: boolean;
}

export function getPKMetrics(medication: Medication): PKMetrics | null {
  const { halfLife, volumeOfDistribution, bioavailability } = medication;
  
  if (!Number.isFinite(halfLife) || halfLife <= 0) return null;
  if (!Number.isFinite(volumeOfDistribution) || volumeOfDistribution <= 0) return null;
  if (!Number.isFinite(bioavailability) || bioavailability <= 0) return null;

  const Ke = Math.LN2 / halfLife;
  const Ka = getKaForMedication(medication, Ke);
  const Tmax = calculateTmax(Ka, Ke);
  const medClass = medication.class || medication.category || 'Other';
  const useTwoCompartment = volumeOfDistribution > 10;

  return {
    Ka,
    Ke,
    Tmax,
    halfLife,
    medClass,
    useTwoCompartment
  };
}

// ============================================
// Effect Compartment Model Functions
// ============================================

export function getKe0ForMedication(medication: Medication): number {
  if (medication.effectParameters?.ke0) {
    return medication.effectParameters.ke0;
  }
  const medClass = medication.class || medication.category || 'Other';
  return KE0_BY_CLASS[medClass] || KE0_BY_CLASS['Other'];
}

export function getEffectLagForMedication(medication: Medication): number {
  if (medication.effectParameters?.effectLag !== undefined) {
    return medication.effectParameters.effectLag;
  }
  const medClass = medication.class || medication.category || 'Other';
  return EFFECT_LAG_BY_CLASS[medClass] || EFFECT_LAG_BY_CLASS['Other'];
}

/**
 * Calculate effect-site (biophase) concentration using the effect compartment model
 *
 * The effect compartment model accounts for the delay between plasma concentration
 * and pharmacological effect. It assumes a hypothetical "effect compartment" that
 * equilibrates with plasma via first-order kinetics.
 *
 * Differential equation: dCe/dt = ke0 × (Cp - Ce)
 *
 * For multiple doses, we sum the effect contributions from each dose using
 * convolution of the plasma concentration profile with the effect equilibration.
 *
 * @param medication - The medication with PK parameters
 * @param doses - Array of doses taken
 * @param targetTime - Time point to calculate effect concentration
 * @param bodyWeight - Patient body weight in kg (default 70)
 * @returns Effect-site concentration in ng/mL (same units as plasma concentration)
 */
export function calculateEffectConcentration(
  medication: Medication,
  doses: MedicationDose[],
  targetTime: number,
  bodyWeight: number = 70
): number {
  return perfMonitor.measure(
    'calculateEffectConcentration',
    () => {
      const ke0 = getKe0ForMedication(medication);
      const effectLag = getEffectLagForMedication(medication);

      // Effect parameters
      const { halfLife, volumeOfDistribution, bioavailability } = medication;

      if (!Number.isFinite(halfLife) || halfLife <= 0) return 0;
      if (!Number.isFinite(volumeOfDistribution) || volumeOfDistribution <= 0) return 0;
      if (!Number.isFinite(bioavailability) || bioavailability <= 0) return 0;

      const Ke = Math.LN2 / halfLife;
      let Ka = getKaForMedication(medication, Ke);
      if (Math.abs(Ka - Ke) < 1e-6) Ka = Ke + 1e-3;

      const Vd = volumeOfDistribution * bodyWeight;
      const F = bioavailability;

      const MG_PER_L_TO_NG_PER_ML = 1000;

      let totalEffectConcentration = 0;

      for (const dose of doses) {
        if (dose.timestamp > targetTime) continue;

        // Time since dose in hours, accounting for effect lag
        const rawTimeSinceDose = (targetTime - dose.timestamp) / (1000 * 3600);
        const timeSinceDose = rawTimeSinceDose - effectLag;

        if (timeSinceDose <= 0) continue;

        const D = dose.doseAmount;

        // Calculate effect concentration using effect compartment model
        // Ce(t) = (F × D × Ka × ke0) / (Vd × (Ka - Ke) × (ke0 - Ke))
        //       × [e^(-Ke×t)/(ke0-Ke) - e^(-Ka×t)/(ke0-Ka) - e^(-ke0×t)×(Ka-Ke)/((ke0-Ke)(ke0-Ka))]
        //
        // Simplified form for numerical stability:
        // Ce(t) ≈ Cp(t) × (1 - e^(-ke0 × t)) for steady observation
        //
        // More accurate: convolution integral approach

        // Calculate plasma concentration at this time point first
        const denom = Vd * (Ka - Ke);
        if (!Number.isFinite(denom) || denom === 0) continue;

        const Cp = (F * D * Ka) / denom *
          (Math.exp(-Ke * timeSinceDose) - Math.exp(-Ka * timeSinceDose));

        // Apply effect compartment equilibration factor
        // This gives the "lagged" effect concentration
        // For ke0 >> Ke: effect tracks plasma closely
        // For ke0 << Ke: effect lags significantly behind plasma

        // Tri-exponential effect compartment solution
        // Ce(t) involves three exponential terms: e^(-Ke×t), e^(-Ka×t), e^(-ke0×t)

        const ke0MinusKe = ke0 - Ke;
        const ke0MinusKa = ke0 - Ka;
        const KaMinusKe = Ka - Ke;

        // Handle edge cases where rate constants are similar
        if (Math.abs(ke0MinusKe) < 1e-6 || Math.abs(ke0MinusKa) < 1e-6) {
          // Fallback to simplified equilibration factor
          const equilibrationFactor = 1 - Math.exp(-ke0 * timeSinceDose);
          totalEffectConcentration += Math.max(0, Cp * equilibrationFactor);
        } else {
          // Full tri-exponential solution
          const coeff = (F * D * Ka * ke0) / (Vd * KaMinusKe);

          const term1 = Math.exp(-Ke * timeSinceDose) / ke0MinusKe;
          const term2 = Math.exp(-Ka * timeSinceDose) / ke0MinusKa;
          const term3 = Math.exp(-ke0 * timeSinceDose) * (KaMinusKe / (ke0MinusKe * ke0MinusKa));

          const Ce = coeff * (term1 - term2 - term3);
          totalEffectConcentration += Math.max(0, Ce);
        }
      }

      return totalEffectConcentration * MG_PER_L_TO_NG_PER_ML;
    },
    {
      medicationId: medication.id,
      doseCount: doses.length,
      bodyWeight
    }
  );
}

/**
 * Generate both plasma and effect concentration curves for visualization
 */
export function generateDualConcentrationCurves(
  medication: Medication,
  doses: MedicationDose[],
  startTime: number,
  endTime: number,
  points: number = 100,
  bodyWeight: number = 70
): Array<{ time: number; plasma: number; effect: number }> {
  return perfMonitor.measure(
    'generateDualConcentrationCurves',
    () => {
      const curve: Array<{ time: number; plasma: number; effect: number }> = [];
      const interval = (endTime - startTime) / points;

      for (let i = 0; i <= points; i++) {
        const time = startTime + (i * interval);
        const plasma = calculateConcentration(medication, doses, time, bodyWeight);
        const effect = calculateEffectConcentration(medication, doses, time, bodyWeight);
        curve.push({ time, plasma, effect });
      }

      return curve;
    },
    {
      medicationId: medication.id,
      points,
      doseCount: doses.length,
      timeRange: endTime - startTime
    }
  );
}

export interface EffectMetrics {
  ke0: number;
  effectLag: number;
  t50Effect: number; // Time to 50% of max effect
  tMaxEffect: number; // Time to peak effect
}

export function getEffectMetrics(medication: Medication): EffectMetrics {
  const ke0 = getKe0ForMedication(medication);
  const effectLag = getEffectLagForMedication(medication);

  const pkMetrics = getPKMetrics(medication);
  const Tmax = pkMetrics?.Tmax || 1;

  // t50 for effect compartment ≈ ln(2) / ke0
  const t50Effect = Math.LN2 / ke0;

  // Time to max effect is approximately Tmax + t50Effect + effectLag
  const tMaxEffect = Tmax + t50Effect + effectLag;

  return {
    ke0,
    effectLag,
    t50Effect,
    tMaxEffect
  };
}

// ============================================
// Steady-State Concentration Functions
// ============================================

const CHRONIC_MEDICATION_CLASSES = ['SSRI', 'SNRI', 'Mood Stabilizer', 'Antipsychotic'];

export function isChronicMedication(medication: Medication): boolean {
  const medClass = medication.class || medication.category || 'Other';
  return CHRONIC_MEDICATION_CLASSES.includes(medClass);
}

export function estimateDosingInterval(doses: MedicationDose[]): number {
  if (doses.length < 2) return 24;

  const sorted = [...doses].sort((a, b) => a.timestamp - b.timestamp);
  const intervals: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const intervalHours = (sorted[i].timestamp - sorted[i - 1].timestamp) / (1000 * 3600);
    if (intervalHours > 4 && intervalHours < 72) {
      intervals.push(intervalHours);
    }
  }

  if (intervals.length === 0) return 24;

  const median = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)];
  if (median < 16) return 12;
  if (median < 30) return 24;
  if (median < 60) return 48;
  return 24;
}

export interface SteadyStateMetrics {
  Css_avg: number;
  Cmax_ss: number;
  Cmin_ss: number;
  fluctuation: number;
  tau: number;
  accumulationFactor: number;
  timeToSteadyState: number;
  atSteadyState: boolean;
}

export function calculateSteadyStateMetrics(
  medication: Medication,
  doses: MedicationDose[],
  bodyWeight: number = 70
): SteadyStateMetrics | null {
  const { halfLife, volumeOfDistribution, bioavailability } = medication;

  if (!Number.isFinite(halfLife) || halfLife <= 0) return null;
  if (!Number.isFinite(volumeOfDistribution) || volumeOfDistribution <= 0) return null;
  if (!Number.isFinite(bioavailability) || bioavailability <= 0) return null;

  const medDoses = doses.filter(d => d.medicationId === medication.id);
  if (medDoses.length < 2) return null;

  const tau = estimateDosingInterval(medDoses);
  const avgDose = medDoses.reduce((sum, d) => sum + d.doseAmount, 0) / medDoses.length;

  const Ke = Math.LN2 / halfLife;
  const Vd = volumeOfDistribution * bodyWeight;
  const F = bioavailability;
  const CL = Ke * Vd;

  const Css_avg_mgL = (F * avgDose) / (CL * tau);
  const Css_avg = Css_avg_mgL * 1000;

  const R = calculateAccumulationFactor(Ke, tau);

  const Ka = getKaForMedication(medication, Ke);
  const Tmax = calculateTmax(Ka, Ke);

  const singleDoseCmax_mgL = (F * avgDose * Ka) / (Vd * (Ka - Ke)) *
    (Math.exp(-Ke * Tmax) - Math.exp(-Ka * Tmax));
  const Cmax_ss = Math.max(0, singleDoseCmax_mgL * R * 1000);

  const Cmin_ss = Cmax_ss * Math.exp(-Ke * tau);

  const fluctuation = Cmax_ss > 0 ? ((Cmax_ss - Cmin_ss) / Css_avg) * 100 : 0;

  const timeToSteadyState = 5 * halfLife;

  const firstDose = Math.min(...medDoses.map(d => d.timestamp));
  const hoursSinceFirst = (Date.now() - firstDose) / (1000 * 3600);
  const atSteadyState = hoursSinceFirst >= timeToSteadyState;

  return {
    Css_avg,
    Cmax_ss,
    Cmin_ss,
    fluctuation,
    tau,
    accumulationFactor: R,
    timeToSteadyState,
    atSteadyState
  };
}

// ============================================
// Adherence Effect Lag (for Chronic Medications)
// ============================================

export interface AdherenceEffectMetrics {
  adherenceLagDays: number;
  adherenceLagHours: number;
  halfLifeCategory: 'short' | 'medium' | 'long' | 'very-long';
  description: string;
  isChronicMed: boolean;
}

export function calculateAdherenceEffectLag(medication: Medication): AdherenceEffectMetrics {
  const { halfLife } = medication;
  const isChronic = isChronicMedication(medication);

  let adherenceLagDays: number;
  let halfLifeCategory: AdherenceEffectMetrics['halfLifeCategory'];
  let description: string;

  if (halfLife < 12) {
    halfLifeCategory = 'short';
    adherenceLagDays = 2;
    description = 'Efeito sensível: variações perceptíveis em 1-2 dias após mudança na adesão';
  } else if (halfLife < 30) {
    halfLifeCategory = 'medium';
    adherenceLagDays = 3;
    description = 'Delay moderado: 2-4 dias entre variação na adesão e impacto no humor';
  } else if (halfLife < 72) {
    halfLifeCategory = 'long';
    adherenceLagDays = 5;
    description = 'Delay longo: 4-6 dias para perceber efeito de doses perdidas';
  } else {
    halfLifeCategory = 'very-long';
    adherenceLagDays = 7;
    description = 'Buffer natural: fluoxetina tem "reserva" de 5-7 dias';
  }

  if (!isChronic) {
    adherenceLagDays = Math.ceil(halfLife / 24);
    description = 'Medicamento de uso agudo: efeito proporcional à concentração plasmática';
  }

  return {
    adherenceLagDays,
    adherenceLagHours: adherenceLagDays * 24,
    halfLifeCategory,
    description,
    isChronicMed: isChronic
  };
}

export function getRecommendedLagForCorrelation(medication: Medication): number {
  const metrics = calculateAdherenceEffectLag(medication);
  return metrics.adherenceLagHours;
}
