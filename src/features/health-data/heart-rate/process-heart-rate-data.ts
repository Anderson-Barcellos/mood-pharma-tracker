/**
 * Script para processar dados de frequência cardíaca do Samsung Health
 * e calcular correlações com humor e concentração de medicamentos
 */
import * as fs from 'fs';
import * as path from 'path';
import { HeartRateParser } from './parser';
import { CorrelationEngine } from '../core/correlation-engine';
import type { HeartRateRecord } from '../core/types';

export class HeartRateProcessor {
  private parser: HeartRateParser;
  private dataDir: string;

  constructor() {
    this.parser = new HeartRateParser();
    this.dataDir = path.join(process.cwd(), 'HEALTH_DATA');
  }

  /**
   * Processa todos os arquivos CSV de frequência cardíaca na pasta HEALTH_DATA
   */
  async processAllHeartRateFiles(): Promise<HeartRateRecord[]> {
    console.log('🔍 Processando dados de frequência cardíaca...');
    
    try {
      const files = fs.readdirSync(this.dataDir)
        .filter(file => file.includes('Frequência Cardíaca') && file.endsWith('.csv'))
        .sort(); // Ordena cronologicamente

      console.log(`📁 Encontrados ${files.length} arquivos de FC`);

      const allRecords: HeartRateRecord[] = [];
      let totalRecords = 0;

      for (const file of files) {
        const filePath = path.join(this.dataDir, file);
        console.log(`📄 Processando: ${file}`);

        try {
          const csvContent = fs.readFileSync(filePath, 'utf-8');
          const records = this.parser.parseCSV(csvContent);
          
          allRecords.push(...records);
          totalRecords += records.length;
          
          console.log(`✅ ${records.length} registros processados de ${file}`);
        } catch (error) {
          console.error(`❌ Erro ao processar ${file}:`, error);
        }
      }

      console.log(`\n📊 RESUMO FINAL:`);
      console.log(`• Total de arquivos: ${files.length}`);
      console.log(`• Total de registros: ${totalRecords}`);
      console.log(`• Período: ${this.getDateRange(allRecords)}`);
      
      return allRecords;
    } catch (error) {
      console.error('❌ Erro ao processar dados de FC:', error);
      return [];
    }
  }

  /**
   * Calcula métricas agregadas dos dados de FC
   */
  calculateAggregateMetrics(records: HeartRateRecord[]): any {
    if (records.length === 0) return null;

    const metrics = HeartRateParser.calculateMetrics(records);
    
    // Análise adicional por contexto
    const contextAnalysis = this.analyzeByContext(records);
    
    // Análise temporal (por hora do dia)
    const temporalAnalysis = this.analyzeByTimeOfDay(records);

    return {
      ...metrics,
      contextDistribution: contextAnalysis,
      temporalPatterns: temporalAnalysis,
      dataQuality: this.assessDataQuality(records)
    };
  }

  /**
   * Analisa distribuição por contexto (repouso, exercício, sono, estresse)
   */
  private analyzeByContext(records: HeartRateRecord[]): any {
    const contextCounts = {
      resting: 0,
      exercise: 0,
      sleep: 0,
      stress: 0
    };

    const contextHRAverage = {
      resting: [] as number[],
      exercise: [] as number[],
      sleep: [] as number[],
      stress: [] as number[]
    };

    records.forEach(record => {
      if (record.context) {
        contextCounts[record.context]++;
        contextHRAverage[record.context].push(record.heartRate);
      }
    });

    // Calcula médias por contexto
    const averages: any = {};
    for (const [context, hrs] of Object.entries(contextHRAverage)) {
      averages[context] = hrs.length > 0 
        ? Math.round(hrs.reduce((sum, hr) => sum + hr, 0) / hrs.length)
        : 0;
    }

    return {
      counts: contextCounts,
      averages,
      percentages: Object.fromEntries(
        Object.entries(contextCounts).map(([context, count]) => [
          context, 
          Math.round((count / records.length) * 100)
        ])
      )
    };
  }

  /**
   * Analisa padrões por hora do dia
   */
  private analyzeByTimeOfDay(records: HeartRateRecord[]): any {
    const hourlyData: { [hour: number]: number[] } = {};
    
    records.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(record.heartRate);
    });

    const hourlyAverages: { [hour: number]: number } = {};
    for (const [hour, hrs] of Object.entries(hourlyData)) {
      const hourNum = parseInt(hour);
      hourlyAverages[hourNum] = Math.round(
        hrs.reduce((sum, hr) => sum + hr, 0) / hrs.length
      );
    }

    return {
      hourlyAverages,
      peakHour: Object.entries(hourlyAverages).reduce((max, [hour, avg]) => 
        avg > max[1] ? [parseInt(hour), avg] : max, [0, 0]
      ),
      restingHour: Object.entries(hourlyAverages).reduce((min, [hour, avg]) => 
        avg < min[1] ? [parseInt(hour), avg] : min, [23, 200]
      )
    };
  }

  /**
   * Avalia qualidade dos dados
   */
  private assessDataQuality(records: HeartRateRecord[]): any {
    const totalMinutes = records.length;
    const uniqueDays = new Set(
      records.map(r => new Date(r.timestamp).toDateString())
    ).size;
    
    // Calcula lacunas nos dados
    const sortedRecords = records.sort((a, b) => a.timestamp - b.timestamp);
    let gaps = 0;
    
    for (let i = 1; i < sortedRecords.length; i++) {
      const timeDiff = sortedRecords[i].timestamp - sortedRecords[i-1].timestamp;
      const minutesDiff = timeDiff / (1000 * 60);
      if (minutesDiff > 2) { // Gap de mais de 2 minutos
        gaps++;
      }
    }

    return {
      totalRecords: totalMinutes,
      uniqueDays,
      averageRecordsPerDay: Math.round(totalMinutes / uniqueDays),
      dataGaps: gaps,
      completeness: Math.round((1 - (gaps / totalMinutes)) * 100),
      timeSpan: this.getDateRange(records)
    };
  }

  /**
   * Obtém range de datas dos dados
   */
  private getDateRange(records: HeartRateRecord[]): string {
    if (records.length === 0) return 'N/A';
    
    const timestamps = records.map(r => r.timestamp).sort((a, b) => a - b);
    const startDate = new Date(timestamps[0]).toLocaleDateString('pt-BR');
    const endDate = new Date(timestamps[timestamps.length - 1]).toLocaleDateString('pt-BR');
    
    return `${startDate} a ${endDate}`;
  }

  /**
   * Salva resultados processados em JSON
   */
  async saveProcessedData(records: HeartRateRecord[], metrics: any): Promise<void> {
    const outputDir = path.join(process.cwd(), 'public/data/health');
    
    // Cria diretório se não existir
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Salva dados brutos processados
    const dataFile = path.join(outputDir, `heart-rate-data-${timestamp}.json`);
    fs.writeFileSync(dataFile, JSON.stringify(records, null, 2));
    
    // Salva métricas
    const metricsFile = path.join(outputDir, `heart-rate-metrics-${timestamp}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    
    // Atualiza índice
    const indexFile = path.join(outputDir, 'heart-rate-index.json');
    const index = {
      lastProcessed: new Date().toISOString(),
      dataFile: path.basename(dataFile),
      metricsFile: path.basename(metricsFile),
      recordCount: records.length,
      dateRange: this.getDateRange(records)
    };
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
    
    console.log(`💾 Dados salvos em:`);
    console.log(`   📄 ${dataFile}`);
    console.log(`   📊 ${metricsFile}`);
    console.log(`   📋 ${indexFile}`);
  }
}

/**
 * Execução principal se rodado diretamente
 */
if (require.main === module) {
  (async () => {
    console.log('🚀 Iniciando processamento de dados de frequência cardíaca...\n');
    
    const processor = new HeartRateProcessor();
    
    try {
      // Processa todos os arquivos
      const records = await processor.processAllHeartRateFiles();
      
      if (records.length === 0) {
        console.log('❌ Nenhum dado de FC processado');
        return;
      }

      // Calcula métricas
      console.log('\n📊 Calculando métricas agregadas...');
      const metrics = processor.calculateAggregateMetrics(records);
      
      // Exibe resumo
      console.log('\n📋 RELATÓRIO DE FREQUÊNCIA CARDÍACA:');
      console.log('═'.repeat(50));
      console.log(`📊 Registros totais: ${records.length.toLocaleString()}`);
      console.log(`📅 Período: ${metrics.dataQuality.timeSpan}`);
      console.log(`🎯 Dias únicos: ${metrics.dataQuality.uniqueDays}`);
      console.log(`💓 FC média: ${metrics.averageHR} bpm`);
      console.log(`🌙 FC repouso: ${metrics.restingHR} bpm`);
      console.log(`📈 FC máxima: ${metrics.maxHR} bpm`);
      console.log(`📉 FC mínima: ${metrics.minHR} bpm`);
      console.log(`📊 Variabilidade: ${metrics.maxHRVariation} bpm`);
      console.log('\n🏷️  DISTRIBUIÇÃO POR CONTEXTO:');
      Object.entries(metrics.contextDistribution.percentages).forEach(([context, percent]) => {
        const avg = metrics.contextDistribution.averages[context];
        console.log(`   ${context}: ${percent}% (média: ${avg} bpm)`);
      });
      
      // Salva dados processados
      console.log('\n💾 Salvando dados processados...');
      await processor.saveProcessedData(records, metrics);
      
      console.log('\n✅ Processamento concluído com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro durante processamento:', error);
      process.exit(1);
    }
  })();
}