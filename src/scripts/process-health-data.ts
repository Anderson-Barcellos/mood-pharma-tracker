#!/usr/bin/env node

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { HeartRateProcessor } from '../features/health-data/services/heart-rate-processor';

async function processHealthDataFolder() {
  console.log('🔍 Buscando arquivos de frequência cardíaca na pasta HEALTH_DATA...');
  
  const healthDataPath = join(process.cwd(), 'HEALTH_DATA');
  
  try {
    // Lista todos os arquivos na pasta
    const files = await readdir(healthDataPath);
    
    // Filtra apenas arquivos CSV de frequência cardíaca
    const hrFiles = files.filter(file => 
      file.includes('Frequência Cardíaca') && file.endsWith('.csv')
    );
    
    console.log(`📁 Encontrados ${hrFiles.length} arquivos de FC`);
    
    if (hrFiles.length === 0) {
      console.log('⚠️ Nenhum arquivo de frequência cardíaca encontrado');
      return;
    }
    
    // Cria array de File objects
    const fileObjects: File[] = [];
    
    for (const fileName of hrFiles) {
      const filePath = join(healthDataPath, fileName);
      const content = await readFile(filePath, 'utf-8');
      const blob = new Blob([content], { type: 'text/csv' });
      const file = new File([blob], fileName, { type: 'text/csv' });
      fileObjects.push(file);
      console.log(`✓ Lido: ${fileName}`);
    }
    
    // Processa todos os arquivos
    console.log('\n⚙️ Processando dados...');
    const processor = new HeartRateProcessor();
    const result = await processor.processFiles(fileObjects);
    
    // Exibe estatísticas
    console.log('\n📊 Estatísticas:');
    console.log(`  Total de registros: ${result.stats.totalRecords}`);
    console.log(`  Período: ${result.stats.dateRange.start.toLocaleDateString()} - ${result.stats.dateRange.end.toLocaleDateString()}`);
    console.log(`  FC média: ${result.stats.avgHeartRate} bpm`);
    console.log(`  FC mínima: ${result.stats.minHeartRate} bpm`);
    console.log(`  FC máxima: ${result.stats.maxHeartRate} bpm`);
    console.log(`  Desvio padrão: ${result.stats.stdDeviation}`);
    
    console.log('\n📈 Distribuição por contexto:');
    Object.entries(result.stats.contextDistribution).forEach(([context, count]) => {
      const percentage = ((count as number) / result.stats.totalRecords * 100).toFixed(1);
      console.log(`  ${context}: ${count} registros (${percentage}%)`);
    });
    
    if (result.errors.length > 0) {
      console.log('\n⚠️ Erros encontrados:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    // Salva resultado em arquivo JSON
    const outputPath = join(process.cwd(), 'public', 'data', 'health', 'processed-heart-rate.json');
    const fs = await import('fs/promises');
    await fs.mkdir(join(process.cwd(), 'public', 'data', 'health'), { recursive: true });
    
    await fs.writeFile(
      outputPath,
      JSON.stringify({
        processedAt: new Date().toISOString(),
        stats: result.stats,
        records: result.records,
        processedFiles: result.processedFiles
      }, null, 2)
    );
    
    console.log(`\n✅ Dados salvos em: ${outputPath}`);
    console.log('🎉 Processamento concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao processar arquivos:', error);
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  processHealthDataFolder().catch(console.error);
}

export { processHealthDataFolder };