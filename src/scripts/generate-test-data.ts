import * as fs from 'fs';
import * as path from 'path';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

const MEDICATIONS_CONFIG: Array<Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    name: 'Sertraline',
    category: 'antidepressant',
    halfLife: 26,
    volumeOfDistribution: 20,
    bioavailability: 0.44,
    absorptionRate: 1.5
  },
  {
    name: 'Escitalopram',
    category: 'antidepressant',
    halfLife: 30,
    volumeOfDistribution: 12,
    bioavailability: 0.80,
    absorptionRate: 2.0
  },
  {
    name: 'Risperidone',
    category: 'antipsychotic',
    halfLife: 20,
    volumeOfDistribution: 1.5,
    bioavailability: 0.70,
    absorptionRate: 1.8
  },
  {
    name: 'Quetiapine',
    category: 'antipsychotic',
    halfLife: 7,
    volumeOfDistribution: 10,
    bioavailability: 0.73,
    absorptionRate: 1.5
  },
  {
    name: 'Lithium Carbonate',
    category: 'mood_stabilizer',
    halfLife: 24,
    volumeOfDistribution: 0.7,
    bioavailability: 0.95,
    absorptionRate: 2.5
  },
  {
    name: 'Lamotrigine',
    category: 'mood_stabilizer',
    halfLife: 29,
    volumeOfDistribution: 1.1,
    bioavailability: 0.98,
    absorptionRate: 2.0
  },
  {
    name: 'Clonazepam',
    category: 'anxiolytic',
    halfLife: 30,
    volumeOfDistribution: 3.2,
    bioavailability: 0.90,
    absorptionRate: 1.2
  }
];

const DOSE_SCHEDULE = {
  'Sertraline': { amount: 100, frequency: 1, times: [8] },
  'Escitalopram': { amount: 20, frequency: 1, times: [20] },
  'Risperidone': { amount: 2, frequency: 2, times: [8, 20] },
  'Quetiapine': { amount: 200, frequency: 2, times: [8, 22] },
  'Lithium Carbonate': { amount: 600, frequency: 2, times: [8, 20] },
  'Lamotrigine': { amount: 100, frequency: 2, times: [8, 20] },
  'Clonazepam': { amount: 0.5, frequency: 2, times: [8, 22] }
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hour: number, minute: number = 0): Date {
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}

async function generateTestData() {
  console.log('🧪 Iniciando geração de dados de teste...\n');

  const startDate = new Date('2024-09-23');
  const endDate = new Date('2024-11-17');
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  console.log(`📅 Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')} (${totalDays} dias)\n`);

  const medications: Medication[] = [];
  const doses: MedicationDose[] = [];
  const moodEntries: MoodEntry[] = [];

  const now = Date.now();
  
  console.log('💊 Criando medicamentos...');
  for (const medConfig of MEDICATIONS_CONFIG) {
    const medication: Medication = {
      id: generateId('med'),
      ...medConfig,
      createdAt: now,
      updatedAt: now
    };
    medications.push(medication);
    console.log(`   ✓ ${medication.name} (${medication.category})`);
  }
  
  console.log(`✅ ${medications.length} medicamentos criados\n`);

  console.log('💉 Gerando doses ao longo do tempo...');
  for (const medication of medications) {
    const schedule = DOSE_SCHEDULE[medication.name as keyof typeof DOSE_SCHEDULE];
    if (!schedule) continue;

    for (let day = 0; day < totalDays; day++) {
      const currentDate = addDays(startDate, day);
      
      const skipProbability = day % 7 === 0 ? 0.15 : 0.05;
      if (Math.random() < skipProbability) continue;

      for (const hour of schedule.times) {
        const variationMinutes = getRandomInRange(-15, 15);
        const doseTime = setTime(currentDate, hour, variationMinutes);
        
        const doseVariation = 1 + (Math.random() - 0.5) * 0.05;
        const actualDose = Math.round(schedule.amount * doseVariation * 100) / 100;

        const dose: MedicationDose = {
          id: generateId('dose'),
          medicationId: medication.id,
          timestamp: doseTime.getTime(),
          doseAmount: actualDose,
          route: 'oral',
          createdAt: doseTime.getTime()
        };
        doses.push(dose);
      }
    }
    console.log(`   ✓ ${medication.name}: ${doses.filter(d => d.medicationId === medication.id).length} doses`);
  }
  
  console.log(`✅ ${doses.length} doses criadas\n`);

  console.log('🎭 Gerando entradas de humor correlacionadas...');
  
  const sertralineMed = medications.find(m => m.name === 'Sertraline');
  const quetiapineMed = medications.find(m => m.name === 'Quetiapine');
  const lithiumMed = medications.find(m => m.name === 'Lithium Carbonate');
  
  for (let day = 0; day < totalDays; day++) {
    const currentDate = addDays(startDate, day);
    
    const weekPhase = (day % 7) / 7;
    const monthPhase = (day % 30) / 30;
    
    const baselineMood = 5 + Math.sin(weekPhase * 2 * Math.PI) * 1.5;
    const monthlyTrend = Math.sin(monthPhase * 2 * Math.PI) * 0.8;
    
    let medicationEffect = 0;
    if (sertralineMed) {
      const daysSinceStart = day;
      const sertralineEffect = Math.min(daysSinceStart / 30, 1) * 1.2;
      medicationEffect += sertralineEffect;
    }
    if (quetiapineMed) {
      const quetiapineEffect = 0.5 * (1 - Math.abs(Math.sin(weekPhase * 2 * Math.PI)));
      medicationEffect += quetiapineEffect;
    }
    
    const entriesPerDay = day % 3 === 0 ? 4 : day % 2 === 0 ? 3 : 2;
    
    for (let i = 0; i < entriesPerDay; i++) {
      const entryHour = [9, 14, 18, 22][i] || 12;
      const entryTime = setTime(currentDate, entryHour, getRandomInRange(-10, 10));
      
      const randomNoise = (Math.random() - 0.5) * 1.5;
      const rawMood = baselineMood + monthlyTrend + medicationEffect + randomNoise;
      const moodScore = Math.max(1, Math.min(10, rawMood));
      
      const anxietyBaseline = 6 - (moodScore - 5) * 0.6;
      const anxietyLevel = Math.max(1, Math.min(10, anxietyBaseline + (Math.random() - 0.5)));
      
      const energyBaseline = 4 + medicationEffect * 0.5 + (moodScore - 5) * 0.4;
      const energyLevel = Math.max(1, Math.min(10, energyBaseline + (Math.random() - 0.5) * 2));
      
      const focusBaseline = 5 + medicationEffect * 0.3 - anxietyLevel * 0.15;
      const focusLevel = Math.max(1, Math.min(10, focusBaseline + (Math.random() - 0.5) * 1.5));

      const entry: MoodEntry = {
        id: generateId('mood'),
        timestamp: entryTime.getTime(),
        moodScore: Math.round(moodScore * 10) / 10,
        anxietyLevel: Math.round(anxietyLevel * 10) / 10,
        energyLevel: Math.round(energyLevel * 10) / 10,
        focusLevel: Math.round(focusLevel * 10) / 10,
        notes: i === 0 && day % 5 === 0 ? 'Teste de correlação' : undefined,
        createdAt: entryTime.getTime()
      };
      moodEntries.push(entry);
    }
  }
  
  console.log(`✅ ${moodEntries.length} entradas de humor criadas\n`);

  console.log('📊 Estatísticas dos dados gerados:');
  console.log('═'.repeat(60));
  
  const moodStats = {
    avg: moodEntries.reduce((sum, e) => sum + e.moodScore, 0) / moodEntries.length,
    min: Math.min(...moodEntries.map(e => e.moodScore)),
    max: Math.max(...moodEntries.map(e => e.moodScore))
  };
  
  const anxietyStats = {
    avg: moodEntries.reduce((sum, e) => sum + (e.anxietyLevel ?? 0), 0) / moodEntries.length,
    min: Math.min(...moodEntries.map(e => e.anxietyLevel ?? 0)),
    max: Math.max(...moodEntries.map(e => e.anxietyLevel ?? 0))
  };

  console.log(`\n🎭 HUMOR:`);
  console.log(`   Média: ${moodStats.avg.toFixed(1)}`);
  console.log(`   Faixa: ${moodStats.min.toFixed(1)} - ${moodStats.max.toFixed(1)}`);
  
  console.log(`\n😰 ANSIEDADE:`);
  console.log(`   Média: ${anxietyStats.avg.toFixed(1)}`);
  console.log(`   Faixa: ${anxietyStats.min.toFixed(1)} - ${anxietyStats.max.toFixed(1)}`);

  console.log(`\n💊 DOSES POR MEDICAMENTO:`);
  for (const med of medications) {
    const medDoses = doses.filter(d => d.medicationId === med.id);
    console.log(`   ${med.name}: ${medDoses.length} doses`);
  }

  const outputData = {
    medications,
    doses,
    moodEntries,
    cognitiveTests: [],
    metadata: {
      version: 3,
      generatedAt: new Date().toISOString(),
      source: 'test-data-generator',
      description: 'Dados de teste para correlações FC/Humor/Medicamentos'
    }
  };

  const outputDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'test-app-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log('\n✅ Geração de dados concluída!');
  console.log('═'.repeat(60));
  console.log(`\n📁 Arquivo salvo em: ${outputPath}`);
  console.log('\n💡 Próximos passos:');
  console.log('   1. Abra o aplicativo no navegador');
  console.log('   2. Use o botão "Import Data" para carregar test-app-data.json');
  console.log('   3. Vá para Analytics Dashboard');
  console.log('   4. Visualize as correlações entre:');
  console.log('      • Frequência cardíaca ↔ Humor');
  console.log('      • Concentração medicamentosa ↔ Humor');
  console.log('      • Frequência cardíaca ↔ Medicamentos');
  
  return outputData;
}

generateTestData().catch(console.error);
