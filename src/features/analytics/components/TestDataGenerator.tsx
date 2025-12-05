import { useState } from 'react';
import { Button } from '@/shared/ui/button';
import { GlassCard } from '@/shared/ui/glass-card';
import { Database, Heart, Brain, Pill, Sparkle } from '@phosphor-icons/react';
import { useAppDataMutator } from '@/hooks/use-app-data-store';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

export default function TestDataGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>('');
  const { mutateAppData } = useAppDataMutator();

  const generateTestData = async () => {
    setIsGenerating(true);
    setStatus('Gerando dados de teste...');
    
    try {
      
      // Cria medicamentos
      const medications: Medication[] = [
        {
          id: 'med1',
          name: 'Sertralina',
          brandName: 'Zoloft',
          genericName: 'Sertraline',
          class: 'SSRI',
          defaultDose: 100,
          unit: 'mg',
          color: '#4CAF50',
          halfLife: 26,
          volumeOfDistribution: 20,
          bioavailability: 0.44,
          absorptionRate: 0.5,
          therapeuticRange: { min: 20, max: 250, unit: 'ng/mL' },
          createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now()
        },
        {
          id: 'med2',
          name: 'Venvanse',
          brandName: 'Vyvanse',
          genericName: 'Lisdexamfetamine',
          class: 'Stimulant',
          defaultDose: 50,
          unit: 'mg',
          color: '#FF9800',
          halfLife: 12,
          volumeOfDistribution: 3.5,
          bioavailability: 0.95,
          absorptionRate: 1.5,
          therapeuticRange: { min: 30, max: 120, unit: 'ng/mL' },
          createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now()
        },
        {
          id: 'med3',
          name: 'Lítio',
          brandName: 'Carbolitium',
          genericName: 'Lithium Carbonate',
          class: 'Mood Stabilizer',
          defaultDose: 300,
          unit: 'mg',
          color: '#9C27B0',
          halfLife: 24,
          volumeOfDistribution: 0.7,
          bioavailability: 0.95,
          absorptionRate: 0.25,
          therapeuticRange: { min: 0.6, max: 1.2, unit: 'mEq/L' },
          createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now()
        }
      ];
      
      setStatus('✅ Preparando medicamentos...');
      
      // Gera doses e mood entries para os últimos 30 dias
      const doses: MedicationDose[] = [];
      const moodEntries: MoodEntry[] = [];
      
      const now = Date.now();
      const startDate = now - 30 * 24 * 60 * 60 * 1000; // 30 dias atrás
      
      for (let day = 0; day < 30; day++) {
        const dayStart = startDate + day * 24 * 60 * 60 * 1000;
        
        // Doses matinais (7-9h)
        const morningTime = dayStart + (7 + Math.random() * 2) * 60 * 60 * 1000;
        
        // Sertralina - 1x ao dia
        doses.push({
          id: `dose_sert_${day}`,
          medicationId: 'med1',
          timestamp: morningTime,
          doseAmount: 100,
          createdAt: morningTime
        });
        
        // Venvanse - 1x ao dia (dias úteis)
        if (day % 7 !== 0 && day % 7 !== 6) {
          doses.push({
            id: `dose_venv_${day}`,
            medicationId: 'med2',
            timestamp: morningTime + 30 * 60 * 1000,
            doseAmount: 50,
            createdAt: morningTime
          });
        }
        
        // Lítio - 2x ao dia
        doses.push({
          id: `dose_lit_morning_${day}`,
          medicationId: 'med3',
          timestamp: morningTime,
          doseAmount: 300,
          createdAt: morningTime
        });
        
        const eveningTime = dayStart + 20 * 60 * 60 * 1000;
        doses.push({
          id: `dose_lit_evening_${day}`,
          medicationId: 'med3',
          timestamp: eveningTime,
          doseAmount: 300,
          createdAt: eveningTime
        });
        
        // Gera 3-5 mood entries por dia
        const moodCount = 3 + Math.floor(Math.random() * 3);
        for (let m = 0; m < moodCount; m++) {
          const moodTime = dayStart + (8 + m * 4) * 60 * 60 * 1000 + Math.random() * 2 * 60 * 60 * 1000;
          
          // Simula padrões realistas
          let baseMood = 5 + Math.sin(day * 0.3) * 2;
          let baseAnxiety = 4 + Math.cos(day * 0.25) * 2;
          let baseEnergy = 6;
          
          // Efeito do Venvanse
          if (day % 7 !== 0 && day % 7 !== 6 && m > 0 && m < 4) {
            baseEnergy += 2;
            baseAnxiety += 0.5;
            baseMood += 1;
          }
          
          // Variação diária
          baseMood += (Math.random() - 0.5) * 2;
          baseAnxiety += (Math.random() - 0.5) * 2;
          baseEnergy += (Math.random() - 0.5) * 2;
          
          // Garante valores entre 1 e 10
          baseMood = Math.max(1, Math.min(10, baseMood));
          baseAnxiety = Math.max(1, Math.min(10, baseAnxiety));
          baseEnergy = Math.max(1, Math.min(10, baseEnergy));
          
          moodEntries.push({
            id: `mood_${day}_${m}`,
            timestamp: moodTime,
            moodScore: Math.round(baseMood),
            anxietyLevel: Math.round(baseAnxiety),
            energyLevel: Math.round(baseEnergy),
            focusLevel: Math.round(baseEnergy * 0.8 + Math.random() * 2),
            notes: m === 0 ? 'Registro matinal' : m === moodCount - 1 ? 'Registro noturno' : '',
            createdAt: moodTime
          });
        }
      }
      
      setStatus(`✅ Preparando ${doses.length} doses e ${moodEntries.length} registros de humor...`);
      
      // Gera e salva dados de FC
      const heartRateData = generateHeartRateData(30);
      localStorage.setItem('heartRateData', JSON.stringify(heartRateData));
      localStorage.setItem('processedHeartRateData', JSON.stringify({
        timestamp: Date.now(),
        records: heartRateData,
        stats: {
          totalRecords: heartRateData.length,
          avgHeartRate: Math.round(heartRateData.reduce((sum, hr) => sum + hr.heartRate, 0) / heartRateData.length),
          dateRange: {
            start: new Date(heartRateData[0].timestamp),
            end: new Date(heartRateData[heartRateData.length - 1].timestamp)
          }
        }
      }));
      
      setStatus('🎉 Dados de teste criados com sucesso!');
      
      // Recarrega a página para atualizar os dados
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao gerar dados:', error);
      setStatus('❌ Erro ao gerar dados de teste');
    } finally {
      setIsGenerating(false);
    }
  };

  function generateHeartRateData(days: number) {
    const data: any[] = [];
    const now = Date.now();
    const startDate = now - days * 24 * 60 * 60 * 1000;
    
    for (let day = 0; day < days; day++) {
      const dayStart = startDate + day * 24 * 60 * 60 * 1000;
      
      // Gera 48 pontos por dia (a cada 30 minutos)
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timestamp = dayStart + hour * 60 * 60 * 1000 + minute * 60 * 1000;
          
          // Simula FC baseada no horário
          let baseHR = 70;
          
          // Sono (22h - 6h): FC mais baixa
          if (hour >= 22 || hour <= 6) {
            baseHR = 55 + Math.random() * 10;
          }
          // Manhã (7h - 12h): FC normal-elevada
          else if (hour >= 7 && hour <= 12) {
            baseHR = 70 + Math.random() * 15;
          }
          // Tarde (13h - 18h): FC normal
          else if (hour >= 13 && hour <= 18) {
            baseHR = 65 + Math.random() * 20;
          }
          // Noite (19h - 21h): FC normal-baixa
          else {
            baseHR = 60 + Math.random() * 15;
          }
          
          // Adiciona variação
          baseHR += (Math.random() - 0.5) * 10;
          
          // Simula exercício ocasional
          if (Math.random() < 0.05 && hour >= 6 && hour <= 20) {
            baseHR = 120 + Math.random() * 30;
          }
          
          data.push({
            id: `hr_${timestamp}`,
            timestamp,
            heartRate: Math.round(baseHR),
            context: hour >= 22 || hour <= 6 ? 'sleep' :
                     baseHR > 100 ? 'exercise' :
                     baseHR > 85 ? 'stress' : 'resting',
            source: 'test-data'
          });
        }
      }
    }
    
    return data;
  }

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
          <Database className="w-8 h-8 text-purple-500" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Gerar Dados de Teste</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Cria 30 dias de dados realistas incluindo medicamentos, doses, humor e frequência cardíaca
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          <div className="flex items-center gap-2 text-sm">
            <Pill className="w-4 h-4 text-green-500" />
            <span>3 medicamentos</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Brain className="w-4 h-4 text-purple-500" />
            <span>~120 registros de humor</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-red-500" />
            <span>~1440 dados de FC</span>
          </div>
        </div>
        
        <Button
          onClick={generateTestData}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          <Sparkle className="w-4 h-4" />
          {isGenerating ? 'Gerando...' : 'Gerar Dados de Teste'}
        </Button>
        
        {status && (
          <p className="text-sm text-muted-foreground">{status}</p>
        )}
      </div>
    </GlassCard>
  );
}