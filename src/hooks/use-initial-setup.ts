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
      // Aguardar carregamento inicial
      if (isLoading) return;

      // CRITICAL FIX: Check DB first, then localStorage
      // Verificar se DB já tem medicações (evitar duplicar seeds)
      if (medications && medications.length > 0) {
        localStorage.setItem('app-initialized', 'true');
        setIsInitialized(true);
        return;
      }

      // Se DB está vazio mas flag está setada, limpar flag e re-seed
      const wasInitialized = localStorage.getItem('app-initialized');
      if (wasInitialized === 'true' && medications.length === 0) {
        console.warn('[InitialSetup] app-initialized flag set but DB is empty! Clearing flag...');
        localStorage.removeItem('app-initialized');
      }

      // Se flag não está setada e DB está vazio, precisamos fazer seed
      if (wasInitialized === 'true') {
        setIsInitialized(true);
        return;
      }

      // Primeira vez: popular medicações pessoais
      try {
        setIsSeeding(true);
        const seeds = generateMedicationSeeds();

        for (const medication of seeds) {
          await createMedication(medication);
        }

        localStorage.setItem('app-initialized', 'true');
        setIsInitialized(true);
        setIsSeeding(false);

        console.log('✅ App initialized with personal medications');
      } catch (error) {
        console.error('Failed to seed medications:', error);
        setIsSeeding(false);
      }
    }

    initializeApp();
  }, [medications, isLoading, createMedication]);

  return {
    isInitialized,
    isSeeding,
    isReady: isInitialized && !isSeeding && !isLoading
  };
}
