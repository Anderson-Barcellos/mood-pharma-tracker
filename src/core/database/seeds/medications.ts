import type { Medication } from '@/shared/types';

/**
 * Medicações pessoais pré-configuradas com parâmetros farmacocinéticos
 * baseados em literatura médica e guidelines clínicos.
 *
 * Parâmetros:
 * - halfLife: Meia-vida de eliminação (horas)
 * - absorptionRate (Ka): Taxa de absorção de primeira ordem (1/h)
 * - volumeOfDistribution (Vd): Volume de distribuição (L/kg)
 * - bioavailability (F): Biodisponibilidade oral (0-1)
 * - therapeuticRange: Faixa terapêutica sérica (ng/mL)
 */

export const PERSONAL_MEDICATIONS: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Venvanse',
    genericName: 'Lisdexanfetamina',
    class: 'Stimulant',
    defaultDose: 50, // mg - dose típica adulto
    unit: 'mg',
    color: '#FF6B6B', // vermelho suave
    halfLife: 11, // horas (após conversão em dexanfetamina)
    absorptionRate: 1.5, // Ka (1/h) - absorção rápida, pico em 3-4h
    volumeOfDistribution: 4.0, // L/kg - valor médio
    bioavailability: 0.964, // 96.4% - excelente biodisponibilidade
    therapeuticRangeMin: 20, // ng/mL (dexanfetamina)
    therapeuticRangeMax: 50, // ng/mL
    therapeuticRangeUnit: 'ng/mL',
    notes: 'Pró-droga de dexanfetamina. Absorção mais suave e duração prolongada. Tomar pela manhã com ou sem alimento.'
  },
  {
    name: 'Lexapro',
    genericName: 'Escitalopram',
    class: 'SSRI',
    defaultDose: 10, // mg - dose inicial típica
    unit: 'mg',
    color: '#4ECDC4', // ciano/turquesa
    halfLife: 30, // horas - valor médio (27-32h)
    absorptionRate: 0.5, // Ka (1/h) - absorção lenta e constante
    volumeOfDistribution: 19, // L/kg - altamente distribuído
    bioavailability: 0.80, // 80%
    therapeuticRangeMin: 15, // ng/mL
    therapeuticRangeMax: 80, // ng/mL
    therapeuticRangeUnit: 'ng/mL',
    notes: 'SSRI de alta seletividade. Estado de equilíbrio (~steady state) em ~1 semana. Pode tomar a qualquer hora do dia.'
  },
  {
    name: 'Lamictal',
    genericName: 'Lamotrigina',
    class: 'Mood Stabilizer',
    defaultDose: 100, // mg - dose de manutenção típica
    unit: 'mg',
    color: '#95E1D3', // verde menta
    halfLife: 29, // horas - valor médio (25-33h)
    absorptionRate: 0.8, // Ka (1/h)
    volumeOfDistribution: 1.1, // L/kg - distribuição moderada
    bioavailability: 0.98, // 98% - excelente
    therapeuticRangeMin: 2500, // ng/mL (2.5 µg/mL)
    therapeuticRangeMax: 15000, // ng/mL (15 µg/mL)
    therapeuticRangeUnit: 'ng/mL',
    notes: 'Estabilizador de humor. Titulação lenta essencial (risco de rash). Sem interação alimentar significativa.'
  },
  {
    name: 'Rivotril',
    genericName: 'Clonazepam',
    class: 'Benzodiazepine',
    defaultDose: 2, // mg - dose típica adulto
    unit: 'mg',
    color: '#F38181', // coral suave
    halfLife: 35, // horas - valor médio (30-40h)
    absorptionRate: 1.0, // Ka (1/h) - absorção relativamente rápida
    volumeOfDistribution: 3.0, // L/kg - valor médio
    bioavailability: 0.90, // 90%
    therapeuticRangeMin: 20, // ng/mL
    therapeuticRangeMax: 80, // ng/mL
    therapeuticRangeUnit: 'ng/mL',
    notes: 'Benzodiazepínico de ação prolongada. Útil para ansiedade e sono. Risco de tolerância/dependência - uso criterioso.'
  }
];

/**
 * Retorna medicações seed com IDs e timestamps gerados
 */
export function generateMedicationSeeds(): Medication[] {
  const now = Date.now();

  return PERSONAL_MEDICATIONS.map((med, index) => ({
    id: `seed-medication-${index + 1}`,
    createdAt: now,
    updatedAt: now,
    ...med
  }));
}

/**
 * Verifica se as medicações seed já foram criadas
 */
export function isSeedMedication(medicationId: string): boolean {
  return medicationId.startsWith('seed-medication-');
}
