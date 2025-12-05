import * as fs from 'fs';
import * as path from 'path';
import { PERSONAL_MEDICATIONS } from '../core/database/seeds/medications';
import type { Medication, MedicationDose, MoodEntry } from '../shared/types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function randomVariation(base: number, variationPercent: number): number {
  const variation = (Math.random() - 0.5) * 2 * variationPercent;
  return base * (1 + variation);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function setTimeOfDay(date: Date, hours: number, minutes: number = 0): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

const DOSE_SCHEDULES: Record<string, { times: number[]; dose: number; skipProbability: number }> = {
  'Venvanse': { times: [7, 8], dose: 50, skipProbability: 0.03 },
  'Lexapro': { times: [22, 23], dose: 10, skipProbability: 0.02 },
  'Lamictal': { times: [8, 22], dose: 100, skipProbability: 0.05 },
  'Rivotril': { times: [22], dose: 2, skipProbability: 0.1 }
};

function generateRealisticData() {
  console.log('🧪 Gerando dados realistas para os últimos 60 dias...\n');

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 60);
  
  const totalDays = 60;
  const now = Date.now();

  console.log(`📅 Período: ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}\n`);

  const medications: Medication[] = PERSONAL_MEDICATIONS.map((med, index) => ({
    id: `med_real_${index + 1}`,
    createdAt: now - (61 * 24 * 60 * 60 * 1000),
    updatedAt: now,
    ...med
  }));

  console.log('💊 Medicações configuradas:');
  medications.forEach(m => console.log(`   - ${m.name} (${m.genericName})`));
  console.log();

  const doses: MedicationDose[] = [];
  const moodEntries: MoodEntry[] = [];

  let baselineMood = 5.5;
  let weekTrend = 0;
  let cumulativeStimulantEffect = 0;

  for (let day = 0; day < totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (day % 7 === 0) {
      weekTrend = (Math.random() - 0.5) * 1.5;
    }

    let dailyStimulantTaken = false;
    let dailySSRITaken = false;
    let dailyMoodStabilizerTaken = false;

    for (const medication of medications) {
      const schedule = DOSE_SCHEDULES[medication.name];
      if (!schedule) continue;

      if (Math.random() < schedule.skipProbability) {
        continue;
      }

      for (const baseHour of schedule.times) {
        const hourVariation = Math.floor(Math.random() * 60) - 30;
        const actualHour = baseHour + (hourVariation / 60);
        const doseTime = setTimeOfDay(currentDate, Math.floor(actualHour), Math.floor((actualHour % 1) * 60));
        
        if (doseTime > new Date()) continue;

        const actualDose = randomVariation(schedule.dose, 0.02);

        const dose: MedicationDose = {
          id: generateId('dose'),
          medicationId: medication.id,
          timestamp: doseTime.getTime(),
          doseAmount: Math.round(actualDose * 10) / 10,
          route: 'oral',
          createdAt: doseTime.getTime()
        };
        doses.push(dose);

        if (medication.name === 'Venvanse') dailyStimulantTaken = true;
        if (medication.name === 'Lexapro') dailySSRITaken = true;
        if (medication.name === 'Lamictal') dailyMoodStabilizerTaken = true;
      }
    }

    if (dailyStimulantTaken) {
      cumulativeStimulantEffect = Math.min(2, cumulativeStimulantEffect + 0.05);
    } else {
      cumulativeStimulantEffect = Math.max(0, cumulativeStimulantEffect - 0.1);
    }

    const numMoodEntries = isWeekend ? 2 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3);
    const moodTimes = isWeekend 
      ? [10, 15, 20, 22].slice(0, numMoodEntries)
      : [8, 12, 17, 21].slice(0, numMoodEntries);

    for (let i = 0; i < numMoodEntries; i++) {
      const entryHour = moodTimes[i] + (Math.random() - 0.5);
      const entryTime = setTimeOfDay(currentDate, Math.floor(entryHour), Math.floor((entryHour % 1) * 60));
      
      if (entryTime > new Date()) continue;

      let hoursSinceMorning = entryHour - 7;
      let stimulantEffect = 0;
      if (dailyStimulantTaken && hoursSinceMorning > 0 && hoursSinceMorning < 14) {
        const peakHour = 4;
        if (hoursSinceMorning < peakHour) {
          stimulantEffect = (hoursSinceMorning / peakHour) * 1.5;
        } else {
          stimulantEffect = Math.max(0, 1.5 - ((hoursSinceMorning - peakHour) / 10) * 1.5);
        }
      }

      const ssriEffect = dailySSRITaken ? 0.3 : 0;
      const moodStabilizerEffect = dailyMoodStabilizerTaken ? 0.2 : -0.3;

      const timeOfDayEffect = Math.sin((entryHour - 6) / 16 * Math.PI) * 0.5;

      const weekendBonus = isWeekend ? 0.3 : 0;
      const mondayPenalty = dayOfWeek === 1 ? -0.4 : 0;

      const randomNoise = (Math.random() - 0.5) * 1.5;

      const rawMood = baselineMood 
        + weekTrend 
        + stimulantEffect 
        + ssriEffect 
        + moodStabilizerEffect 
        + cumulativeStimulantEffect 
        + timeOfDayEffect 
        + weekendBonus 
        + mondayPenalty 
        + randomNoise;

      const moodScore = Math.max(1, Math.min(10, Math.round(rawMood * 10) / 10));

      const anxietyBase = 5 - (moodScore - 5) * 0.4 - stimulantEffect * 0.3;
      const anxietyLevel = Math.max(1, Math.min(10, Math.round((anxietyBase + (Math.random() - 0.5) * 2) * 10) / 10));

      const energyBase = 4 + stimulantEffect * 1.2 + (isWeekend ? 0.5 : 0) + timeOfDayEffect;
      const energyLevel = Math.max(1, Math.min(10, Math.round((energyBase + (Math.random() - 0.5) * 2) * 10) / 10));

      const focusBase = 4 + stimulantEffect * 1.5 - anxietyLevel * 0.1;
      const focusLevel = Math.max(1, Math.min(10, Math.round((focusBase + (Math.random() - 0.5) * 1.5) * 10) / 10));

      const cognitiveScore = Math.max(1, Math.min(10, Math.round((
        (focusLevel * 0.4) + (energyLevel * 0.3) + (moodScore * 0.2) - (anxietyLevel * 0.1) + 2
      ) * 10) / 10));

      const entry: MoodEntry = {
        id: generateId('mood'),
        timestamp: entryTime.getTime(),
        moodScore,
        anxietyLevel,
        energyLevel,
        focusLevel,
        cognitiveScore,
        createdAt: entryTime.getTime()
      };
      moodEntries.push(entry);
    }
  }

  doses.sort((a, b) => a.timestamp - b.timestamp);
  moodEntries.sort((a, b) => a.timestamp - b.timestamp);

  console.log('📊 Estatísticas geradas:');
  console.log('═'.repeat(50));
  console.log(`\n💊 Doses: ${doses.length} registros`);
  for (const med of medications) {
    const medDoses = doses.filter(d => d.medicationId === med.id);
    console.log(`   - ${med.name}: ${medDoses.length} doses`);
  }

  console.log(`\n🎭 Humor: ${moodEntries.length} registros`);
  const avgMood = moodEntries.reduce((sum, e) => sum + e.moodScore, 0) / moodEntries.length;
  const avgAnxiety = moodEntries.reduce((sum, e) => sum + (e.anxietyLevel || 0), 0) / moodEntries.length;
  const avgEnergy = moodEntries.reduce((sum, e) => sum + (e.energyLevel || 0), 0) / moodEntries.length;
  const avgFocus = moodEntries.reduce((sum, e) => sum + (e.focusLevel || 0), 0) / moodEntries.length;
  const avgCognitive = moodEntries.reduce((sum, e) => sum + ((e as any).cognitiveScore || 0), 0) / moodEntries.length;

  console.log(`   - Humor médio: ${avgMood.toFixed(1)}/10`);
  console.log(`   - Ansiedade média: ${avgAnxiety.toFixed(1)}/10`);
  console.log(`   - Energia média: ${avgEnergy.toFixed(1)}/10`);
  console.log(`   - Foco médio: ${avgFocus.toFixed(1)}/10`);
  console.log(`   - Cognição média: ${avgCognitive.toFixed(1)}/10`);

  const outputData = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    medications,
    doses,
    moodEntries,
    cognitiveTests: []
  };

  const outputDir = path.join(process.cwd(), 'public', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'app-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

  console.log('\n✅ Dados salvos em:', outputPath);
  console.log('\n🚀 Reinicie o servidor de desenvolvimento para carregar os novos dados!');

  return outputData;
}

generateRealisticData();
