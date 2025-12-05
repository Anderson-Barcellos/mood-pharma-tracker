/**
 * Análise de correlações entre Frequência Cardíaca, Humor e Concentração de Medicamentos
 * Script avançado para integração de todos os dados de saúde
 */
import * as fs from 'fs';
import * as path from 'path';

// Types
interface HeartRateRecord {
  id: string;
  timestamp: number;
  heartRate: number;
  context?: 'resting' | 'exercise' | 'sleep' | 'stress';
  source: string;
}

interface MoodRecord {
  timestamp: number;
  moodScore: number;
  anxietyLevel: number;
  energyLevel: number;
  focusLevel: number;
  notes?: string;
}

interface MedicationConcentration {
  timestamp: number;
  medicationName: string;
  concentration: number; // mg/L in blood
  doseTimestamp?: number;
  timeFromDose?: number; // hours
}

interface CorrelationResult {
  correlation: number;
  pValue: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
  interpretation: string;
}

interface TimeAlignedData {
  timestamp: number;
  heartRate?: number;
  hrContext?: string;
  moodScore?: number;
  anxietyLevel?: number;
  energyLevel?: number;
  focusLevel?: number;
  concentrations?: Record<string, number>;
}

class CorrelationAnalyzer {
  
  /**
   * Parse heart rate data from Samsung Health CSVs
   */
  parseHeartRateData(): HeartRateRecord[] {
    console.log('[CHART] Carregando dados de frequência cardíaca...');
    
    const dataDir = path.join(process.cwd(), 'HEALTH_DATA');
    const files = fs.readdirSync(dataDir)
      .filter(file => file.includes('Frequência Cardíaca') && file.endsWith('.csv'))
      .sort();
    
    const allRecords: HeartRateRecord[] = [];
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      try {
        const csvContent = fs.readFileSync(filePath, 'utf-8');
        const records = this.parseHeartRateCSV(csvContent);
        allRecords.push(...records);
      } catch (error) {
        console.warn(`⚠️ Erro ao processar ${file}:`, error);
      }
    }
    
    console.log(`[OK] ${allRecords.length} registros de FC carregados`);
    return allRecords.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  private parseHeartRateCSV(csvContent: string): HeartRateRecord[] {
    const lines = csvContent.trim().split('\n');
    const records: HeartRateRecord[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length >= 3) {
        const dateStr = parts[0];
        const hrStr = parts[2];
        
        // Parse timestamp - format: "2025.06.24 00:00:29"
        const datePart = dateStr.split(' ')[0];
        const timePart = dateStr.split(' ')[1];
        
        const [year, month, day] = datePart.split('.').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        const date = new Date(year, month - 1, day, hour, minute, second);
        
        const heartRate = parseInt(hrStr);
        if (heartRate > 0 && heartRate < 300) {
          let context: HeartRateRecord['context'] = 'resting';
          if (hour >= 22 || hour <= 6) {
            context = 'sleep';
          } else if (heartRate > 120) {
            context = 'exercise';
          } else if (heartRate < 50 || heartRate > 100) {
            context = 'stress';
          }
          
          records.push({
            id: `hr_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: date.getTime(),
            heartRate,
            context,
            source: 'samsung-health'
          });
        }
      }
    }
    
    return records;
  }
  
  /**
   * Load mood data from IndexedDB export or simulate
   */
  loadMoodData(): MoodRecord[] {
    console.log('🎭 Carregando dados de humor...');
    
    // Try to load from existing app data
    const appDataPath = path.join(process.cwd(), 'public/data/app-data.json');
    
    if (fs.existsSync(appDataPath)) {
      try {
        const appData = JSON.parse(fs.readFileSync(appDataPath, 'utf-8'));
        const moodEntries = appData.moodEntries || [];
        
        const moodRecords: MoodRecord[] = moodEntries.map((entry: any) => ({
          timestamp: entry.timestamp,
          moodScore: entry.moodScore,
          anxietyLevel: entry.anxietyLevel,
          energyLevel: entry.energyLevel,
          focusLevel: entry.focusLevel,
          notes: entry.notes
        }));
        
        console.log(`[OK] ${moodRecords.length} registros de humor carregados`);
        return moodRecords;
      } catch (error) {
        console.warn('⚠️ Erro ao carregar dados de humor:', error);
      }
    }
    
    // Simulate mood data if none exists
    console.log('🤖 Simulando dados de humor para demonstração...');
    return this.simulateMoodData();
  }
  
  private simulateMoodData(): MoodRecord[] {
    const records: MoodRecord[] = [];
    const startDate = new Date('2025-06-23');
    const endDate = new Date('2025-08-22');
    
    for (let d = startDate; d <= endDate; d.setHours(d.getHours() + 6)) {
      // Simulate 4 mood entries per day
      const baseScore = 5 + Math.sin(d.getTime() / (1000 * 60 * 60 * 24 * 7)) * 2; // Weekly cycle
      const randomVariation = (Math.random() - 0.5) * 2;
      
      records.push({
        timestamp: d.getTime(),
        moodScore: Math.max(1, Math.min(10, baseScore + randomVariation)),
        anxietyLevel: Math.max(1, Math.min(10, 5 + Math.random() * 3)),
        energyLevel: Math.max(1, Math.min(10, 6 + Math.random() * 2)),
        focusLevel: Math.max(1, Math.min(10, 5 + Math.random() * 4)),
        notes: Math.random() > 0.7 ? 'Simulado para demonstração' : undefined
      });
    }
    
    console.log(`🤖 ${records.length} registros de humor simulados`);
    return records;
  }
  
  /**
   * Load or simulate medication concentration data
   */
  loadMedicationData(): MedicationConcentration[] {
    console.log('[MEDS] Carregando dados de concentração de medicamentos...');
    
    // Simulate medication concentration based on pharmacokinetic models
    const records: MedicationConcentration[] = [];
    const medications = [
      { name: 'Sertraline', halfLife: 24, dose: 50 },
      { name: 'Risperidone', halfLife: 20, dose: 2 },
      { name: 'Lithium', halfLife: 18, dose: 600 }
    ];
    
    const startDate = new Date('2025-06-23');
    const endDate = new Date('2025-08-22');
    
    medications.forEach(med => {
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        // Simulate twice daily dosing
        [8, 20].forEach(hour => {
          const doseTime = new Date(d);
          doseTime.setHours(hour, 0, 0, 0);
          
          // Calculate concentrations for 24 hours after dose
          for (let h = 0; h < 24; h += 2) {
            const sampleTime = new Date(doseTime.getTime() + h * 60 * 60 * 1000);
            const concentration = this.calculateConcentration(med.dose, h, med.halfLife);
            
            records.push({
              timestamp: sampleTime.getTime(),
              medicationName: med.name,
              concentration,
              doseTimestamp: doseTime.getTime(),
              timeFromDose: h
            });
          }
        });
      }
    });
    
    console.log(`[PILL] ${records.length} registros de concentração simulados`);
    return records.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  private calculateConcentration(dose: number, hoursFromDose: number, halfLife: number): number {
    // Simple one-compartment model
    const k = 0.693 / halfLife; // Elimination constant
    const concentration = (dose * 0.8) * Math.exp(-k * hoursFromDose); // Assume 80% bioavailability
    return Math.round(concentration * 100) / 100;
  }
  
  /**
   * Align all data by timestamp (nearest neighbor within time window)
   */
  alignDataByTime(
    hrData: HeartRateRecord[], 
    moodData: MoodRecord[], 
    medData: MedicationConcentration[],
    windowMinutes: number = 30
  ): TimeAlignedData[] {
    console.log('[ALIGN] Alinhando dados por timestamp...');
    
    const alignedData: TimeAlignedData[] = [];
    const windowMs = windowMinutes * 60 * 1000;
    
    // Use HR data as base timestamps (most frequent)
    hrData.forEach(hrRecord => {
      const baseTime = hrRecord.timestamp;
      const alignedRecord: TimeAlignedData = {
        timestamp: baseTime,
        heartRate: hrRecord.heartRate,
        hrContext: hrRecord.context,
        concentrations: {}
      };
      
      // Find nearest mood record
      const nearestMood = moodData.find(mood => 
        Math.abs(mood.timestamp - baseTime) <= windowMs
      );
      if (nearestMood) {
        alignedRecord.moodScore = nearestMood.moodScore;
        alignedRecord.anxietyLevel = nearestMood.anxietyLevel;
        alignedRecord.energyLevel = nearestMood.energyLevel;
        alignedRecord.focusLevel = nearestMood.focusLevel;
      }
      
      // Find medication concentrations
      medData.forEach(med => {
        if (Math.abs(med.timestamp - baseTime) <= windowMs) {
          alignedRecord.concentrations![med.medicationName] = med.concentration;
        }
      });
      
      // Only include records with at least HR + one other metric
      if (alignedRecord.moodScore !== undefined || Object.keys(alignedRecord.concentrations!).length > 0) {
        alignedData.push(alignedRecord);
      }
    });
    
    console.log(`[SYNC] ${alignedData.length} registros alinhados`);
    return alignedData;
  }
  
  /**
   * Calculate Pearson correlation coefficient
   */
  calculateCorrelation(x: number[], y: number[]): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
      return {
        correlation: 0,
        pValue: 1,
        significance: 'none',
        interpretation: 'Dados insuficientes para análise'
      };
    }

    const n = x.length;
    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumXSquares = 0;
    let sumYSquares = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      
      numerator += diffX * diffY;
      sumXSquares += diffX * diffX;
      sumYSquares += diffY * diffY;
    }

    const denominator = Math.sqrt(sumXSquares * sumYSquares);
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    // T-statistic for significance
    const tStat = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const pValue = tStat > 2.57 ? 0.01 : tStat > 1.96 ? 0.05 : 0.5;

    let significance: 'strong' | 'moderate' | 'weak' | 'none' = 'none';
    let interpretation = '';

    const absCorr = Math.abs(correlation);
    if (pValue <= 0.01 && absCorr >= 0.7) {
      significance = 'strong';
      interpretation = `Correlacao ${correlation > 0 ? 'positiva' : 'negativa'} forte e estatisticamente significante`;
    } else if (pValue <= 0.05 && absCorr >= 0.4) {
      significance = 'moderate';
      interpretation = `Correlacao ${correlation > 0 ? 'positiva' : 'negativa'} moderada e significante`;
    } else if (absCorr >= 0.2) {
      significance = 'weak';
      interpretation = `Correlacao ${correlation > 0 ? 'positiva' : 'negativa'} fraca`;
    } else {
      interpretation = 'Nenhuma correlação significante detectada';
    }

    return {
      correlation: Math.round(correlation * 1000) / 1000,
      pValue: Math.round(pValue * 1000) / 1000,
      significance,
      interpretation
    };
  }
  
  /**
   * Run comprehensive correlation analysis
   */
  runCorrelationAnalysis(): any {
    console.log('🔬 Iniciando análise de correlações...');
    console.log('═'.repeat(60));
    
    // Load all data
    const hrData = this.parseHeartRateData();
    const moodData = this.loadMoodData();
    const medData = this.loadMedicationData();
    
    if (hrData.length === 0) {
      console.error('❌ Nenhum dado de FC encontrado');
      return null;
    }
    
    // Align data by timestamp
    const alignedData = this.alignDataByTime(hrData, moodData, medData);
    
    if (alignedData.length < 10) {
      console.error('❌ Dados insuficientes para análise de correlação');
      return null;
    }
    
    console.log('\n[CHART] ANÁLISE DE CORRELAÇÕES:');
    console.log('═'.repeat(60));
    
    const results: any = {
      metadata: {
        analyzedAt: new Date().toISOString(),
        totalRecords: alignedData.length,
        heartRateRecords: hrData.length,
        moodRecords: moodData.length,
        medicationRecords: medData.length,
        dateRange: this.getDateRange(alignedData)
      },
      correlations: {}
    };
    
    // 1. Heart Rate ↔ Mood correlations
    const validMoodData = alignedData.filter(d => d.moodScore !== undefined && d.heartRate !== undefined);
    if (validMoodData.length >= 10) {
      const hrValues = validMoodData.map(d => d.heartRate!);
      const moodValues = validMoodData.map(d => d.moodScore!);
      const anxietyValues = validMoodData.map(d => d.anxietyLevel!);
      const energyValues = validMoodData.map(d => d.energyLevel!);
      const focusValues = validMoodData.map(d => d.focusLevel!);
      
      results.correlations.heartRate_mood = {
        mood: this.calculateCorrelation(hrValues, moodValues),
        anxiety: this.calculateCorrelation(hrValues, anxietyValues),
        energy: this.calculateCorrelation(hrValues, energyValues),
        focus: this.calculateCorrelation(hrValues, focusValues)
      };
      
      console.log('💓 FREQUÊNCIA CARDÍACA ↔ HUMOR:');
      console.log(`   Humor Geral: r=${results.correlations.heartRate_mood.mood.correlation} (${results.correlations.heartRate_mood.mood.significance})`);
      console.log(`   Ansiedade: r=${results.correlations.heartRate_mood.anxiety.correlation} (${results.correlations.heartRate_mood.anxiety.significance})`);
      console.log(`   Energia: r=${results.correlations.heartRate_mood.energy.correlation} (${results.correlations.heartRate_mood.energy.significance})`);
      console.log(`   Foco: r=${results.correlations.heartRate_mood.focus.correlation} (${results.correlations.heartRate_mood.focus.significance})`);
    }
    
    // 2. Heart Rate ↔ Medication correlations
    const medications = ['Sertraline', 'Risperidone', 'Lithium'];
    results.correlations.heartRate_medications = {};
    
    medications.forEach(medName => {
      const medData = alignedData.filter(d => 
        d.heartRate !== undefined && 
        d.concentrations && 
        d.concentrations[medName] !== undefined
      );
      
      if (medData.length >= 10) {
        const hrValues = medData.map(d => d.heartRate!);
        const concentrations = medData.map(d => d.concentrations![medName]);
        
        results.correlations.heartRate_medications[medName] = this.calculateCorrelation(hrValues, concentrations);
        
        console.log(`[MEDS] FC <-> ${medName}: r=${results.correlations.heartRate_medications[medName].correlation} (${results.correlations.heartRate_medications[medName].significance}`);
      }
    });
    
    // 3. Medication ↔ Mood correlations
    results.correlations.medication_mood = {};
    
    medications.forEach(medName => {
      const medMoodData = alignedData.filter(d => 
        d.moodScore !== undefined && 
        d.concentrations && 
        d.concentrations[medName] !== undefined
      );
      
      if (medMoodData.length >= 10) {
        const concentrations = medMoodData.map(d => d.concentrations![medName]);
        const moodValues = medMoodData.map(d => d.moodScore!);
        const anxietyValues = medMoodData.map(d => d.anxietyLevel!);
        
        results.correlations.medication_mood[medName] = {
          mood: this.calculateCorrelation(concentrations, moodValues),
          anxiety: this.calculateCorrelation(concentrations, anxietyValues)
        };
        
        console.log(`🎭 ${medName} ↔ Humor: r=${results.correlations.medication_mood[medName].mood.correlation} (${results.correlations.medication_mood[medName].mood.significance})`);
      }
    });
    
    // 4. Context-based analysis
    console.log('\n[TAG] ANÁLISE POR CONTEXTO:');
    const contextAnalysis = this.analyzeByContext(alignedData);
    results.contextAnalysis = contextAnalysis;
    
    Object.entries(contextAnalysis).forEach(([context, data]: [string, any]) => {
      console.log(`   ${context}: ${data.count} registros, FC média: ${data.avgHeartRate} bpm`);
    });
    
    return results;
  }
  
  private analyzeByContext(data: TimeAlignedData[]): any {
    const contexts = ['sleep', 'resting', 'stress', 'exercise'];
    const analysis: any = {};
    
    contexts.forEach(context => {
      const contextData = data.filter(d => d.hrContext === context && d.heartRate !== undefined);
      
      if (contextData.length > 0) {
        const heartRates = contextData.map(d => d.heartRate!);
        const avgHR = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
        
        // Mood data for this context
        const moodData = contextData.filter(d => d.moodScore !== undefined);
        const avgMood = moodData.length > 0 
          ? moodData.reduce((sum, d) => sum + d.moodScore!, 0) / moodData.length
          : null;
        
        analysis[context] = {
          count: contextData.length,
          avgHeartRate: Math.round(avgHR),
          avgMood: avgMood ? Math.round(avgMood * 10) / 10 : null,
          percentage: Math.round((contextData.length / data.length) * 100)
        };
      }
    });
    
    return analysis;
  }
  
  private getDateRange(data: TimeAlignedData[]): string {
    if (data.length === 0) return 'N/A';
    
    const timestamps = data.map(d => d.timestamp).sort();
    const startDate = new Date(timestamps[0]).toLocaleDateString('pt-BR');
    const endDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('pt-BR');
    
    return `${startDate} a ${endDate}`;
  }
  
  /**
   * Save analysis results
   */
  saveResults(results: any): void {
    const outputDir = path.join(process.cwd(), 'public/data/health');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(outputDir, `heart-rate-correlation-analysis-${timestamp}.json`);
    
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
    
    console.log(`\n[SAVE] Resultados salvos em: ${filePath}`);
  }
}

// Execute analysis
const analyzer = new CorrelationAnalyzer();
const results = analyzer.runCorrelationAnalysis();

if (results) {
  analyzer.saveResults(results);
  console.log('\n[OK] Análise de correlações concluída!');
} else {
  console.log('\n[ERROR] Falha na análise de correlações');
}