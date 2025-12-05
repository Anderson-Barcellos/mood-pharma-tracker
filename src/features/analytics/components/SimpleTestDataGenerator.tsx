import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { GlassCard } from '@/shared/ui/glass-card';
import { Database, Sparkle } from '@phosphor-icons/react';
import { useAppDataMutator } from '@/hooks/use-app-data-store';

export default function SimpleTestDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const { mutateAppData } = useAppDataMutator();

  const generateTestData = async () => {
    setIsGenerating(true);
    
    try {
      await mutateAppData((snapshot) => {
        const now = Date.now();
        const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
        
        // Medicamentos de teste
        const medications = [
          {
            id: 'med_test_1',
            name: 'Sertralina',
            brandName: 'Zoloft',
            class: 'SSRI',
            defaultDose: 100,
            unit: 'mg',
            halfLife: 26,
            volumeOfDistribution: 20,
            bioavailability: 0.44,
            absorptionRate: 0.5,
            createdAt: thirtyDaysAgo,
            updatedAt: now
          },
          {
            id: 'med_test_2',
            name: 'Venvanse',
            brandName: 'Vyvanse',
            class: 'Stimulant',
            defaultDose: 50,
            unit: 'mg',
            halfLife: 12,
            volumeOfDistribution: 3.5,
            bioavailability: 0.95,
            absorptionRate: 1.5,
            createdAt: thirtyDaysAgo,
            updatedAt: now
          }
        ];
        
        // Gera doses simples
        const doses = [];
        for (let day = 0; day < 30; day++) {
          const dayStart = thirtyDaysAgo + day * 24 * 60 * 60 * 1000;
          const morningTime = dayStart + 8 * 60 * 60 * 1000; // 8h da manhã
          
          doses.push({
            id: `dose_test_${day}_1`,
            medicationId: 'med_test_1',
            timestamp: morningTime,
            doseAmount: 100,
            createdAt: morningTime
          });
          
          if (day % 7 !== 0 && day % 7 !== 6) { // Dias úteis
            doses.push({
              id: `dose_test_${day}_2`,
              medicationId: 'med_test_2',
              timestamp: morningTime + 30 * 60 * 1000,
              doseAmount: 50,
              createdAt: morningTime
            });
          }
        }
        
        // Gera mood entries
        const moodEntries = [];
        for (let day = 0; day < 30; day++) {
          const dayStart = thirtyDaysAgo + day * 24 * 60 * 60 * 1000;
          
          for (let hour of [9, 14, 20]) { // 3 entradas por dia
            const timestamp = dayStart + hour * 60 * 60 * 1000;
            const baseMood = 5 + Math.sin(day * 0.3) * 2 + Math.random() * 2;
            
            moodEntries.push({
              id: `mood_test_${day}_${hour}`,
              timestamp,
              moodScore: Math.round(Math.max(1, Math.min(10, baseMood))),
              anxietyLevel: Math.round(Math.max(1, Math.min(10, 5 + Math.random() * 3))),
              energyLevel: Math.round(Math.max(1, Math.min(10, 6 + Math.random() * 2))),
              createdAt: timestamp
            });
          }
        }
        
        // Gera dados de FC para localStorage
        const heartRateData = [];
        for (let day = 0; day < 30; day++) {
          const dayStart = thirtyDaysAgo + day * 24 * 60 * 60 * 1000;
          
          for (let hour = 0; hour < 24; hour += 2) { // A cada 2 horas
            const timestamp = dayStart + hour * 60 * 60 * 1000;
            let baseHR = 70;
            
            if (hour >= 22 || hour <= 6) {
              baseHR = 55 + Math.random() * 10; // Sono
            } else if (hour >= 7 && hour <= 20) {
              baseHR = 65 + Math.random() * 25; // Dia
            }
            
            heartRateData.push({
              id: `hr_test_${timestamp}`,
              timestamp,
              heartRate: Math.round(baseHR),
              context: hour >= 22 || hour <= 6 ? 'sleep' : 'resting',
              source: 'test-data'
            });
          }
        }
        
        // Salva FC no localStorage
        localStorage.setItem('heartRateData', JSON.stringify(heartRateData));
        localStorage.setItem('processedHeartRateData', JSON.stringify({
          timestamp: now,
          records: heartRateData
        }));
        
        // Retorna os novos dados
        return {
          ...snapshot,
          medications,
          doses,
          moodEntries
        };
      });
      
      // Recarrega a página após sucesso
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao gerar dados:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <Database className="w-8 h-8 text-purple-500" />
        <h3 className="text-lg font-semibold">Sem Dados Disponíveis</h3>
        <p className="text-sm text-muted-foreground">
          Clique abaixo para gerar dados de teste
        </p>
        <Button
          onClick={generateTestData}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          <Sparkle className="w-4 h-4" />
          {isGenerating ? 'Gerando...' : 'Gerar Dados de Teste'}
        </Button>
      </div>
    </GlassCard>
  );
}