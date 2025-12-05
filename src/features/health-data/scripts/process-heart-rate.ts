#!/usr/bin/env tsx
/**
 * Script para processar dados de frequência cardíaca do Samsung Health
 * e gerar arquivo JSON para visualização no dashboard
 */

import * as fs from 'fs';
import * as path from 'path';

interface HeartRateRecord {
  timestamp: number;
  heartRate: number;
  context: 'sleep' | 'resting' | 'stress' | 'exercise';
  date: string;
  time: string;
}

function parseCSVFile(filePath: string): HeartRateRecord[] {
  const records: HeartRateRecord[] = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Remove quotes and split by comma
      const parts = line.replace(/"/g, '').split(',');
      
      if (parts.length >= 3) {
        const dateTimeStr = parts[0];
        const hrStr = parts[2];
        
        if (!dateTimeStr || !hrStr) continue;
        
        // Parse date and time
        const [datePart, timePart] = dateTimeStr.split(' ');
        if (!datePart || !timePart) continue;
        
        const [year, month, day] = datePart.split('.').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        
        if (isNaN(year) || isNaN(month) || isNaN(day)) continue;
        
        const date = new Date(year, month - 1, day, hour || 0, minute || 0, second || 0);
        const heartRate = parseInt(hrStr);
        
        if (heartRate > 30 && heartRate < 250) {
          // Determine context based on HR and time
          let context: HeartRateRecord['context'] = 'resting';
          
          if ((hour >= 22 || hour <= 6) && heartRate < 75) {
            context = 'sleep';
          } else if (heartRate > 120) {
            context = 'exercise';
          } else if (heartRate > 100 || heartRate < 50) {
            context = 'stress';
          }
          
          records.push({
            timestamp: date.getTime(),
            heartRate,
            context,
            date: datePart,
            time: timePart
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
  
  return records;
}

function main() {
  console.log('🔄 Processing heart rate data from Samsung Health CSV files...\n');
  
  const dataDir = path.join(process.cwd(), 'HEALTH_DATA');
  const outputDir = path.join(process.cwd(), 'public/data/health');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Get all CSV files
  const csvFiles = fs.readdirSync(dataDir)
    .filter(file => file.includes('Frequência Cardíaca') && file.endsWith('.csv'))
    .sort();
  
  console.log(`📂 Found ${csvFiles.length} CSV files to process\n`);
  
  const allRecords: HeartRateRecord[] = [];
  const fileStats: { file: string; records: number }[] = [];
  
  // Process each file
  csvFiles.forEach((file, index) => {
    process.stdout.write(`Processing (${index + 1}/${csvFiles.length}): ${file}...`);
    
    const filePath = path.join(dataDir, file);
    const records = parseCSVFile(filePath);
    
    allRecords.push(...records);
    fileStats.push({ file, records: records.length });
    
    console.log(` ✓ ${records.length} records`);
  });
  
  // Sort by timestamp
  allRecords.sort((a, b) => a.timestamp - b.timestamp);
  
  // Calculate statistics
  const stats = {
    totalRecords: allRecords.length,
    dateRange: {
      start: allRecords[0]?.date || 'N/A',
      end: allRecords[allRecords.length - 1]?.date || 'N/A'
    },
    avgHeartRate: Math.round(
      allRecords.reduce((sum, r) => sum + r.heartRate, 0) / allRecords.length
    ),
    contextDistribution: {} as Record<string, number>,
    hourlyDistribution: {} as Record<number, { count: number; avgHR: number }>,
    dailyStats: {} as Record<string, { min: number; max: number; avg: number; count: number }>
  };
  
  // Context distribution
  allRecords.forEach(record => {
    stats.contextDistribution[record.context] = 
      (stats.contextDistribution[record.context] || 0) + 1;
    
    // Hourly distribution
    const hour = new Date(record.timestamp).getHours();
    if (!stats.hourlyDistribution[hour]) {
      stats.hourlyDistribution[hour] = { count: 0, avgHR: 0 };
    }
    stats.hourlyDistribution[hour].count++;
    stats.hourlyDistribution[hour].avgHR += record.heartRate;
    
    // Daily stats
    if (!stats.dailyStats[record.date]) {
      stats.dailyStats[record.date] = {
        min: record.heartRate,
        max: record.heartRate,
        avg: record.heartRate,
        count: 1
      };
    } else {
      const daily = stats.dailyStats[record.date];
      daily.min = Math.min(daily.min, record.heartRate);
      daily.max = Math.max(daily.max, record.heartRate);
      daily.avg = ((daily.avg * daily.count) + record.heartRate) / (daily.count + 1);
      daily.count++;
    }
  });
  
  // Calculate hourly averages
  Object.keys(stats.hourlyDistribution).forEach(hour => {
    const data = stats.hourlyDistribution[parseInt(hour)];
    data.avgHR = Math.round(data.avgHR / data.count);
  });
  
  // Create output data
  const outputData = {
    metadata: {
      processedAt: new Date().toISOString(),
      totalRecords: stats.totalRecords,
      dateRange: stats.dateRange,
      avgHeartRate: stats.avgHeartRate,
      filesProcessed: csvFiles.length
    },
    statistics: stats,
    records: allRecords,
    fileStats
  };
  
  // Save to JSON file
  const outputPath = path.join(outputDir, 'processed-heart-rate-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  // Also save a lighter version without individual records for faster loading
  const summaryData = {
    ...outputData,
    records: undefined
  };
  const summaryPath = path.join(outputDir, 'heart-rate-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 PROCESSING COMPLETE');
  console.log('='.repeat(60));
  console.log(`📈 Total records: ${stats.totalRecords}`);
  console.log(`📅 Date range: ${stats.dateRange.start} to ${stats.dateRange.end}`);
  console.log(`💓 Average HR: ${stats.avgHeartRate} bpm`);
  console.log('\n📂 Context distribution:');
  Object.entries(stats.contextDistribution).forEach(([context, count]) => {
    const percentage = ((count / stats.totalRecords) * 100).toFixed(1);
    console.log(`   ${context}: ${count} records (${percentage}%)`);
  });
  console.log('\n💾 Output files:');
  console.log(`   Full data: ${outputPath}`);
  console.log(`   Summary: ${summaryPath}`);
  console.log('\n✅ Data ready for dashboard visualization!');
}

// Run the script
main();