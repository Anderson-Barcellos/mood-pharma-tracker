#!/usr/bin/env tsx
/**
 * Processa todos os CSVs de frequência cardíaca do Samsung Health
 * e gera um arquivo JSON para importação no app
 */

import * as fs from 'fs';
import * as path from 'path';

interface HeartRateRecord {
  id: string;
  timestamp: number;
  heartRate: number;
  context?: 'sleep' | 'resting' | 'stress' | 'exercise';
  source: string;
  date?: string;
  time?: string;
}

function parseHeartRateCSV(csvContent: string, fileName: string): HeartRateRecord[] {
  const lines = csvContent.trim().split('\n');
  const records: HeartRateRecord[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 3) {
      const dateTimeStr = parts[0]; // "2025.06.23 22:21:39"
      const hrStr = parts[2];
      
      // Parse timestamp
      const [datePart, timePart] = dateTimeStr.split(' ');
      if (!datePart || !timePart) continue;
      
      const [year, month, day] = datePart.split('.').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      
      // Ajustar ano se for 2025 para 2024 (dados de teste)
      const adjustedYear = year === 2025 ? 2024 : year;
      
      const date = new Date(adjustedYear, month - 1, day, hour, minute, second);
      const heartRate = parseInt(hrStr);
      
      if (heartRate > 30 && heartRate < 250) {
        // Determine context based on time and HR
        let context: HeartRateRecord['context'] = 'resting';
        
        if (hour >= 22 || hour <= 6) {
          context = 'sleep';
        } else if (heartRate > 120) {
          context = 'exercise';
        } else if (heartRate > 100 || heartRate < 50) {
          context = 'stress';
        }
        
        records.push({
          id: `hr_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: date.getTime(),
          heartRate,
          context,
          source: 'samsung-health',
          date: date.toLocaleDateString('pt-BR'),
          time: timePart
        });
      }
    }
  }
  
  return records;
}

function processAllHeartRateFiles() {
  console.log('💓 Processando arquivos de frequência cardíaca...\n');
  
  const dataDir = path.join(process.cwd(), 'HEALTH_DATA');
  const files = fs.readdirSync(dataDir)
    .filter(file => file.includes('Frequência Cardíaca') && file.endsWith('.csv'))
    .sort();
  
  console.log(`📁 Encontrados ${files.length} arquivos CSV de frequência cardíaca\n`);
  
  const allRecords: HeartRateRecord[] = [];
  const stats = {
    totalFiles: files.length,
    totalRecords: 0,
    dateRange: { start: new Date(), end: new Date(0) },
    avgHeartRate: 0,
    minHeartRate: 999,
    maxHeartRate: 0,
    contextCounts: {
      sleep: 0,
      resting: 0,
      stress: 0,
      exercise: 0
    }
  };
  
  // Process each file
  files.forEach((file, index) => {
    const filePath = path.join(dataDir, file);
    try {
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const records = parseHeartRateCSV(csvContent, file);
      
      if (records.length > 0) {
        console.log(`✓ ${file}: ${records.length} registros`);
        allRecords.push(...records);
        
        // Update stats
        records.forEach(record => {
          stats.totalRecords++;
          stats.avgHeartRate += record.heartRate;
          
          if (record.heartRate < stats.minHeartRate) {
            stats.minHeartRate = record.heartRate;
          }
          if (record.heartRate > stats.maxHeartRate) {
            stats.maxHeartRate = record.heartRate;
          }
          
          const recordDate = new Date(record.timestamp);
          if (recordDate < stats.dateRange.start) {
            stats.dateRange.start = recordDate;
          }
          if (recordDate > stats.dateRange.end) {
            stats.dateRange.end = recordDate;
          }
          
          if (record.context) {
            stats.contextCounts[record.context]++;
          }
        });
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao processar ${file}:`, error);
    }
  });
  
  // Calculate average
  stats.avgHeartRate = Math.round(stats.avgHeartRate / stats.totalRecords);
  
  // Sort records by timestamp
  allRecords.sort((a, b) => a.timestamp - b.timestamp);
  
  console.log('\n📊 Estatísticas dos dados processados:');
  console.log('═'.repeat(60));
  console.log(`\n💓 FREQUÊNCIA CARDÍACA:`);
  console.log(`   Total de registros: ${stats.totalRecords.toLocaleString('pt-BR')}`);
  console.log(`   Período: ${stats.dateRange.start.toLocaleDateString('pt-BR')} a ${stats.dateRange.end.toLocaleDateString('pt-BR')}`);
  console.log(`   FC Média: ${stats.avgHeartRate} bpm`);
  console.log(`   FC Mínima: ${stats.minHeartRate} bpm`);
  console.log(`   FC Máxima: ${stats.maxHeartRate} bpm`);
  
  console.log(`\n🏷️ DISTRIBUIÇÃO POR CONTEXTO:`);
  console.log(`   Sono: ${stats.contextCounts.sleep.toLocaleString('pt-BR')} (${Math.round(stats.contextCounts.sleep / stats.totalRecords * 100)}%)`);
  console.log(`   Repouso: ${stats.contextCounts.resting.toLocaleString('pt-BR')} (${Math.round(stats.contextCounts.resting / stats.totalRecords * 100)}%)`);
  console.log(`   Estresse: ${stats.contextCounts.stress.toLocaleString('pt-BR')} (${Math.round(stats.contextCounts.stress / stats.totalRecords * 100)}%)`);
  console.log(`   Exercício: ${stats.contextCounts.exercise.toLocaleString('pt-BR')} (${Math.round(stats.contextCounts.exercise / stats.totalRecords * 100)}%)`);
  
  // Create output object
  const outputData = {
    heartRateData: allRecords,
    statistics: stats,
    metadata: {
      processedAt: new Date().toISOString(),
      source: 'Samsung Health',
      version: '1.0.0'
    }
  };
  
  // Save to file
  const outputDir = path.join(process.cwd(), 'public', 'data', 'health');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'heart-rate-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log('\n✅ Dados de frequência cardíaca processados!');
  console.log('═'.repeat(60));
  console.log(`\n📁 Arquivo salvo em: ${outputPath}`);
  console.log(`   Tamanho: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  // Also create a lighter summary file for quick loading
  const summaryData = {
    totalRecords: stats.totalRecords,
    dateRange: stats.dateRange,
    avgHeartRate: stats.avgHeartRate,
    minHeartRate: stats.minHeartRate,
    maxHeartRate: stats.maxHeartRate,
    contextDistribution: stats.contextCounts,
    // Include only last 1000 records for preview
    recentData: allRecords.slice(-1000),
    metadata: outputData.metadata
  };
  
  const summaryPath = path.join(outputDir, 'heart-rate-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  
  console.log(`\n📁 Resumo salvo em: ${summaryPath}`);
  console.log(`   Tamanho: ${(fs.statSync(summaryPath).size / 1024).toFixed(2)} KB`);
  
  console.log('\n💡 Próximos passos:');
  console.log('   1. Acesse https://ultrassom.ai:8114/test-import.html');
  console.log('   2. Os dados de FC serão carregados automaticamente');
  console.log('   3. Vá para Analytics Dashboard para ver as correlações');
  console.log('   4. Use o seletor de período (7 dias, 30 dias, tudo)');
  
  return outputData;
}

// Execute
processAllHeartRateFiles();