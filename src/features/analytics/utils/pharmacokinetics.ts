import type { Medication, MedicationDose } from '@/shared/types';
import { perfMonitor } from './performance-monitor';

// Enable debug logging via console
const DEBUG_PK = false; // Set to true to enable pharmacokinetic debug logs

function debugLog(message: string, data?: any) {
  if (DEBUG_PK) {
    console.log(`[PK Debug] ${message}`, data || '');
  }
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
      const { halfLife, volumeOfDistribution, bioavailability, absorptionRate } = medication;

      // Guard invalid parameters to avoid NaNs/infinities
      if (!Number.isFinite(halfLife) || halfLife <= 0) return 0;
      if (!Number.isFinite(volumeOfDistribution) || volumeOfDistribution <= 0) return 0;
      if (!Number.isFinite(bioavailability) || bioavailability <= 0) return 0;

      // Elimination rate constant (1/h) - Use Math.LN2 for precision
      const Ke = Math.LN2 / halfLife;

      // Absorption rate constant (1/h)
      // Default: 3x faster than elimination for typical oral medications
      let Ka = Number.isFinite(absorptionRate) && absorptionRate! > 0
        ? absorptionRate!
        : Math.max(Ke * 3, 0.5); // Faster absorption, minimum 0.5/h

      // Avoid numerical instability when Ka ≈ Ke
      if (Math.abs(Ka - Ke) < 1e-6) Ka = Ke + 1e-3;

      const Vd = volumeOfDistribution * bodyWeight; // L
      const F = bioavailability; // fraction [0..1]

      // Decide between one-compartment vs two-compartment model
      // Two-compartment for highly distributed drugs (Vd > 10 L/kg)
      const useTwoCompartment = volumeOfDistribution > 10;

      debugLog(`Medication: ${medication.name}`, {
        halfLife,
        Ke: Ke.toFixed(4),
        Ka: Ka.toFixed(4),
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
