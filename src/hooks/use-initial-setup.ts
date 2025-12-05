import { useEffect, useState } from 'react';
import { useMedications } from './use-medications';
import { generateMedicationSeeds } from '@/core/database/seeds/medications';

/**
 * Hook que gerencia o setup inicial do app
 * - Popula medicações pessoais na primeira vez
 * - Retorna status do setup
 */
export function useInitialSetup() {
  const { medications, createMedication, isLoading } = useMedications();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      if (isLoading) return;

      if (medications && medications.length > 0) {
        setIsInitialized(true);
        return;
      }

      if (isSeeding) return;

      try {
        setIsSeeding(true);
        const seeds = generateMedicationSeeds();

        for (const medication of seeds) {
          await createMedication(medication);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to seed medications:', error);
      } finally {
        setIsSeeding(false);
      }
    }

    initializeApp();
  }, [createMedication, isLoading, isSeeding, medications]);

  return {
    isInitialized,
    isSeeding,
    isReady: isInitialized && !isSeeding && !isLoading
  };
}
