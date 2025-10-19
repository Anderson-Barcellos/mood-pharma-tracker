import type { Medication, MedicationDose } from '@/shared/types';

export function calculateConcentration(
  medication: Medication,
  doses: MedicationDose[],
  targetTime: number,
  bodyWeight: number = 70
): number {
  const { halfLife, volumeOfDistribution, bioavailability, absorptionRate } = medication;
  
  const Ke = 0.693 / halfLife;
  const Ka = absorptionRate || 1.0;
  const Vd = volumeOfDistribution * bodyWeight;
  const F = bioavailability;
  
  let totalConcentration = 0;
  
  for (const dose of doses) {
    if (dose.timestamp > targetTime) continue;
    
    const timeSinceDose = (targetTime - dose.timestamp) / (1000 * 3600);
    const D = dose.doseAmount;
    
    if (timeSinceDose < 0) continue;
    
    const concentration = (F * D * Ka) / (Vd * (Ka - Ke)) * 
      (Math.exp(-Ke * timeSinceDose) - Math.exp(-Ka * timeSinceDose));
    
    totalConcentration += Math.max(0, concentration);
  }
  
  return totalConcentration;
}

export function generateConcentrationCurve(
  medication: Medication,
  doses: MedicationDose[],
  startTime: number,
  endTime: number,
  points: number = 100,
  bodyWeight: number = 70
): Array<{ time: number; concentration: number }> {
  const curve: Array<{ time: number; concentration: number }> = [];
  const interval = (endTime - startTime) / points;
  
  for (let i = 0; i <= points; i++) {
    const time = startTime + (i * interval);
    const concentration = calculateConcentration(medication, doses, time, bodyWeight);
    curve.push({ time, concentration });
  }
  
  return curve;
}
