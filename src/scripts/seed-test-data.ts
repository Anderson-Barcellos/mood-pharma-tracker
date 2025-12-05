import { db } from '@/core/database/db';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

async function seedTestData() {
  console.log('🌱 Populando banco de dados com dados de teste...');
  
  // Limpa dados existentes
  await db.medications.clear();
  await db.doses.clear();
  await db.moodEntries.clear();
  
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
  
  await db.medications.bulkAdd(medications);
  console.log('✅ Medicamentos criados');
  
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
    
    // Venvanse - 1x ao dia
    if (day % 7 !== 0 && day % 7 !== 6) { // Não toma no fim de semana
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
    
    const eveningTime = dayStart + 20 * 60 * 60 * 1000; // 20h
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
      let baseMood = 5 + Math.sin(day * 0.3) * 2; // Oscilação ao longo do mês
      let baseAnxiety = 4 + Math.cos(day * 0.25) * 2;
      let baseEnergy = 6;
      
      // Efeito do Venvanse (aumenta energia e foco, pode aumentar ansiedade)
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
  
  await db.doses.bulkAdd(doses);
  console.log(`✅ ${doses.length} doses criadas`);
  
  await db.moodEntries.bulkAdd(moodEntries);
  console.log(`✅ ${moodEntries.length} registros de humor criados`);
  
  // Salva dados de FC no localStorage para teste
  const heartRateData = generateHeartRateData(30);
  localStorage.setItem('heartRateData', JSON.stringify(heartRateData));
  console.log(`✅ ${heartRateData.length} registros de FC salvos no localStorage`);
  
  console.log('🎉 Dados de teste criados com sucesso!');
  console.log('📊 Resumo:');
  console.log(`  - ${medications.length} medicamentos`);
  console.log(`  - ${doses.length} doses`);
  console.log(`  - ${moodEntries.length} registros de humor`);
  console.log(`  - ${heartRateData.length} registros de FC`);
}

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

// Executa quando chamado diretamente
if (typeof window !== 'undefined') {
  (window as any).seedTestData = seedTestData;
  console.log('💡 Para popular dados de teste, execute: seedTestData()');
}

export { seedTestData };