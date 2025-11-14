import { readFile, writeFile } from 'fs/promises';
import { SamsungHealthParser } from '../services/samsung-health-parser';
import { SleepAnalyzer } from './sleep-analytics';

/**
 * Process the Samsung Health sample data and generate analytics
 */
export async function processSampleSleepData() {
  try {
    // Read the sample file
    const csvContent = await readFile('/root/Talk/Dormir 2025.06.24 00:00:00 Samsung Health.csv', 'utf-8');
    
    console.log('🔍 Processando dados do Samsung Health...');
    
    // Parse the CSV data
    const sleepSession = SamsungHealthParser.parseSleepCSV(csvContent);
    
    console.log('\n📊 Sessão de Sono Processada:');
    console.log(`📅 Data: ${sleepSession.date}`);
    console.log(`⏰ Duração total: ${sleepSession.totalDuration} minutos`);
    console.log(`🌙 Início: ${new Date(sleepSession.startTime).toLocaleTimeString('pt-BR')}`);
    console.log(`🌅 Fim: ${new Date(sleepSession.endTime).toLocaleTimeString('pt-BR')}`);
    
    console.log('\n📈 Métricas Detalhadas:');
    const m = sleepSession.metrics;
    console.log(`💤 Tempo total de sono: ${m.totalSleepTime} min (${(m.totalSleepTime/60).toFixed(1)}h)`);
    console.log(`🌑 Sono leve: ${m.lightSleepTime} min (${m.lightSleepPercentage}%)`);
    console.log(`🌚 Sono profundo: ${m.deepSleepTime} min (${m.deepSleepPercentage}%)`);
    console.log(`🧠 Sono REM: ${m.remSleepTime} min (${m.remSleepPercentage}%)`);
    console.log(`😴 Acordado: ${m.awakeTime} min (${m.awakePercentage}%)`);
    
    console.log('\n🎯 Qualidade do Sono:');
    console.log(`✨ Eficiência: ${m.sleepEfficiency}%`);
    console.log(`🎯 Score geral: ${m.sleepScore}/100`);
    console.log(`🔢 Número de despertares: ${m.numberOfAwakenings}`);
    console.log(`⏱️ Tempo até sono profundo: ${m.timeToDeepSleep} min`);
    console.log(`⏱️ Tempo até REM: ${m.timeToREM} min`);
    
    // Save the processed data
    await SamsungHealthParser.saveSleepSession(sleepSession);
    console.log('\n💾 Dados salvos em /root/CODEX/mood-pharma-tracker/public/data/');
    
    // Generate analytics (for this single session)
    const analytics = SleepAnalyzer.analyzeSleepTrends([sleepSession]);
    
    console.log('\n🔮 Análise e Recomendações:');
    analytics.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
    
    // Calculate sleep debt
    const sleepDebt = SleepAnalyzer.calculateSleepDebt([sleepSession], 8);
    console.log(`\n💰 Débito de sono: ${sleepDebt} minutos`);
    
    // Suggest optimal bedtime
    const bedtimeInfo = SleepAnalyzer.suggestOptimalBedtime([sleepSession]);
    console.log(`\n🕰️ Horário sugerido: ${bedtimeInfo.bedtime}`);
    console.log(`📊 Confiança: ${(bedtimeInfo.confidence * 100).toFixed(0)}%`);
    console.log(`💡 Explicação: ${bedtimeInfo.reasoning}`);
    
    // Save detailed analysis report
    const report = {
      sessionData: sleepSession,
      analytics,
      sleepDebt,
      bedtimeRecommendation: bedtimeInfo,
      generatedAt: new Date().toISOString()
    };
    
    await writeFile(
      '/root/CODEX/mood-pharma-tracker/public/data/sleep-analysis-report.json',
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📋 Relatório completo salvo: sleep-analysis-report.json');
    
    return report;
    
  } catch (error) {
    console.error('❌ Erro ao processar dados de sono:', error);
    throw error;
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('process-sample-data.ts')) {
  processSampleSleepData()
    .then(() => {
      console.log('\n✅ Processamento concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Falha no processamento:', error);
      process.exit(1);
    });
}