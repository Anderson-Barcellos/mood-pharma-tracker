/**
 * Demo script para processar dados de frequência cardíaca
 */
import * as fs from 'fs';
import * as path from 'path';

// Simulação simples dos parsers (sem dependências complexas)
interface HeartRateRecord {
  id: string;
  timestamp: number;
  heartRate: number;
  context?: 'resting' | 'exercise' | 'sleep' | 'stress';
  source: string;
}

function parseHeartRateCSV(csvContent: string): HeartRateRecord[] {
  const lines = csvContent.trim().split('\n');
  const records: HeartRateRecord[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 3) {
      const dateStr = parts[0];
      const timeStr = parts[1];
      const hrStr = parts[2];
      
      // Parse timestamp - format: "2025.06.24 00:00:29"
      const datePart = dateStr.split(' ')[0]; // "2025.06.24"
      const timePart = dateStr.split(' ')[1]; // "00:00:29"
      
      const [year, month, day] = datePart.split('.').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      const date = new Date(year, month - 1, day, hour, minute, second);
      
      const heartRate = parseInt(hrStr);
      if (heartRate > 0 && heartRate < 300) {
        // Determine context based on hour and HR
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

function calculateCorrelation(x: number[], y: number[]): { correlation: number; pValue: number } {
  if (x.length !== y.length || x.length < 3) {
    return { correlation: 0, pValue: 1 };
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

  // Simple p-value approximation
  const tStat = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
  const pValue = tStat > 2 ? 0.05 : 0.5; // Simplified

  return {
    correlation: Math.round(correlation * 1000) / 1000,
    pValue: Math.round(pValue * 1000) / 1000
  };
}

// Main execution
console.log('🔍 Processando dados de frequência cardíaca...');

const dataDir = path.join(process.cwd(), 'HEALTH_DATA');
const files = fs.readdirSync(dataDir)
  .filter(file => file.includes('Frequência Cardíaca') && file.endsWith('.csv'))
  .sort();

console.log(`📁 Encontrados ${files.length} arquivos de FC`);

const allRecords: HeartRateRecord[] = [];

// Process each file
for (const file of files.slice(0, 5)) { // Process first 5 files for demo
  const filePath = path.join(dataDir, file);
  console.log(`📄 Processando: ${file}`);
  
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const records = parseHeartRateCSV(csvContent);
    allRecords.push(...records);
    console.log(`✅ ${records.length} registros processados`);
  } catch (error) {
    console.error(`❌ Erro ao processar ${file}:`, error);
  }
}

console.log(`\n📊 RESUMO DOS DADOS DE FC:`);
console.log(`• Total de registros: ${allRecords.length.toLocaleString()}`);

if (allRecords.length > 0) {
  // Calculate basic metrics
  const heartRates = allRecords.map(r => r.heartRate);
  const avgHR = Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length);
  const minHR = Math.min(...heartRates);
  const maxHR = Math.max(...heartRates);
  
  // Context distribution
  const contexts = allRecords.reduce((acc, r) => {
    if (r.context) acc[r.context] = (acc[r.context] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Time range
  const timestamps = allRecords.map(r => r.timestamp).sort();
  const startDate = new Date(timestamps[0]).toLocaleDateString('pt-BR');
  const endDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('pt-BR');
  
  console.log(`📅 Período: ${startDate} a ${endDate}`);
  console.log(`💓 FC média: ${avgHR} bpm`);
  console.log(`📈 FC máxima: ${maxHR} bpm`);
  console.log(`📉 FC mínima: ${minHR} bpm`);
  
  console.log('\n🏷️ DISTRIBUIÇÃO POR CONTEXTO:');
  Object.entries(contexts).forEach(([context, count]) => {
    const percentage = Math.round((count / allRecords.length) * 100);
    console.log(`   ${context}: ${count} registros (${percentage}%)`);
  });
  
  // Hourly analysis
  console.log('\n🕐 ANÁLISE POR HORA DO DIA:');
  const hourlyData: { [hour: number]: number[] } = {};
  
  allRecords.forEach(record => {
    const hour = new Date(record.timestamp).getHours();
    if (!hourlyData[hour]) hourlyData[hour] = [];
    hourlyData[hour].push(record.heartRate);
  });
  
  const hourlyAverages: Array<[number, number]> = [];
  Object.entries(hourlyData).forEach(([hour, hrs]) => {
    const avg = Math.round(hrs.reduce((sum, hr) => sum + hr, 0) / hrs.length);
    hourlyAverages.push([parseInt(hour), avg]);
  });
  
  hourlyAverages.sort((a, b) => a[0] - b[0]);
  hourlyAverages.forEach(([hour, avg]) => {
    const hourStr = hour.toString().padStart(2, '0');
    console.log(`   ${hourStr}:00 - ${avg} bpm`);
  });
  
  // Simulate mood correlation data (you would replace with actual mood data)
  console.log('\n🎭 SIMULAÇÃO DE CORRELAÇÃO COM HUMOR:');
  const simulatedMood = allRecords.map(() => Math.random() * 10); // 0-10 scale
  const hrData = allRecords.map(r => r.heartRate);
  
  const moodCorrelation = calculateCorrelation(hrData, simulatedMood);
  console.log(`   Correlação FC ↔ Humor: ${moodCorrelation.correlation} (p=${moodCorrelation.pValue})`);
  
  // Save processed data
  const outputDir = path.join(process.cwd(), 'public/data/health');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, 'heart-rate-demo-analysis.json');
  const analysisData = {
    processedAt: new Date().toISOString(),
    summary: {
      totalRecords: allRecords.length,
      dateRange: `${startDate} a ${endDate}`,
      averageHR: avgHR,
      minHR,
      maxHR,
      contextDistribution: contexts,
      hourlyAverages: Object.fromEntries(hourlyAverages)
    },
    correlations: {
      mood: moodCorrelation
    },
    sampleRecords: allRecords.slice(0, 10) // First 10 records as example
  };
  
  fs.writeFileSync(outputFile, JSON.stringify(analysisData, null, 2));
  console.log(`\n💾 Análise salva em: ${outputFile}`);
  
} else {
  console.log('❌ Nenhum registro válido encontrado');
}

console.log('\n✅ Demo de processamento concluído!');