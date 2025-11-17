import { HealthDataProcessor } from './process-health-data';
import { HealthDataService } from './health-database';
import { MedicationHealthIntegration } from './medication-health-integration';
import { db } from '@/core/database/db';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

/**
 * Complete health data analysis pipeline
 * Processes Samsung Health data and integrates with medication/mood tracking
 */
export class CompleteHealthAnalysis {

  /**
   * Run complete analysis pipeline
   */
  static async runCompleteAnalysis(): Promise<void> {
    console.log('🚀 Iniciando análise completa dos dados de saúde...');
    
    try {
      // Step 1: Process all Samsung Health CSV files
      console.log('\n📊 ETAPA 1: Processando dados do Samsung Health');
      const healthExport = await HealthDataProcessor.processAllHealthData();
      
      // Step 2: Save to health database
      console.log('\n💾 ETAPA 2: Salvando no banco de dados');
      await HealthDataService.saveHealthRecords(healthExport.records);
      await HealthDataService.saveHealthSessions(healthExport.sessions);
      
      // Step 3: Load medication and mood data from main database
      console.log('\n🔗 ETAPA 3: Carregando dados de medicação e humor');
      const [medications, doses, moodEntries] = await Promise.all([
        db.medications.toArray(),
        db.doses.toArray(),
        db.moodEntries.toArray()
      ]);
      
      console.log(`📈 Encontrados: ${medications.length} medicações, ${doses.length} doses, ${moodEntries.length} registros de humor`);
      
      // Step 4: Run comprehensive correlation analysis
      if (medications.length > 0 && (doses.length > 0 || moodEntries.length > 0)) {
        console.log('\n🔍 ETAPA 4: Análise de correlações avançadas');
        const correlationResults = await MedicationHealthIntegration.analyzeComprehensiveCorrelations(
          healthExport.sessions,
          medications,
          doses,
          moodEntries
        );
        
        // Save correlation results
        const allCorrelations = [
          ...correlationResults.healthMoodCorrelations,
          ...correlationResults.healthMedicationCorrelations,
          ...correlationResults.moodMedicationCorrelations
        ];
        
        await HealthDataService.saveAnalytics(allCorrelations, correlationResults.insights);
        
        console.log(`🎯 Correlações encontradas:`);
        console.log(`  Saúde ↔ Humor: ${correlationResults.healthMoodCorrelations.length}`);
        console.log(`  Saúde ↔ Medicação: ${correlationResults.healthMedicationCorrelations.length}`);
        console.log(`  Humor ↔ Medicação: ${correlationResults.moodMedicationCorrelations.length}`);
        console.log(`  Insights gerados: ${correlationResults.insights.length}`);
        
        // Display top insights
        if (correlationResults.insights.length > 0) {
          console.log('\n💡 PRINCIPAIS INSIGHTS:');
          correlationResults.insights.slice(0, 3).forEach((insight, index) => {
            console.log(`${index + 1}. ${insight.title}`);
            console.log(`   ${insight.description}`);
            console.log(`   Confiança: ${(insight.confidence * 100).toFixed(0)}%\n`);
          });
        }
        
        // Display top correlations
        if (allCorrelations.length > 0) {
          console.log('🔗 CORRELAÇÕES MAIS SIGNIFICATIVAS:');
          allCorrelations
            .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
            .slice(0, 5)
            .forEach((corr, index) => {
              console.log(`${index + 1}. ${this.formatVariableName(corr.variable1)} ↔ ${this.formatVariableName(corr.variable2)}`);
              console.log(`   Correlação: ${corr.correlation.toFixed(3)} (p=${corr.significance.toFixed(3)})`);
              console.log(`   Dados: ${corr.dataPoints} pontos\n`);
            });
        }
        
      } else {
        console.log('\n⚠️ Sem dados de medicação/humor suficientes para correlações avançadas');
      }
      
      // Step 5: Generate final summary
      console.log('\n📋 ETAPA 5: Gerando resumo final');
      const summary = await this.generateCompleteSummary();
      
      // Save summary to file
      await this.saveFinalReport(summary, healthExport);
      
      console.log('\n✅ ANÁLISE COMPLETA FINALIZADA!');
      console.log('📁 Relatórios salvos em: public/data/health/');
      
    } catch (error) {
      console.error('\n❌ Erro durante análise completa:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive summary of all health data
   */
  private static async generateCompleteSummary(): Promise<any> {
    const [healthSummary, insights, correlations] = await Promise.all([
      HealthDataService.getHealthSummary(),
      HealthDataService.getRecentInsights(5),
      HealthDataService.getSignificantCorrelations(0.1, 0.3)
    ]);

    return {
      overview: {
        totalHealthRecords: healthSummary.totalRecords,
        totalHealthSessions: healthSummary.totalSessions,
        averageHealthScore: healthSummary.averageHealthScore,
        dateRange: healthSummary.dateRange,
        dataTypes: Object.keys(healthSummary.recordsByType)
      },
      dataBreakdown: healthSummary.recordsByType,
      topInsights: insights.slice(0, 3),
      significantCorrelations: correlations.slice(0, 10),
      recommendations: this.generateRecommendations(insights, correlations),
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate actionable recommendations based on analysis
   */
  private static generateRecommendations(
    insights: any[], 
    correlations: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on health score
    const avgScore = insights.find(i => i.title?.includes('Score'))?.confidence || 0;
    if (avgScore < 0.6) {
      recommendations.push('Considere consulta médica para otimização do tratamento atual.');
    }

    // Based on correlations
    const strongCorrelations = correlations.filter(c => Math.abs(c.correlation) > 0.6);
    if (strongCorrelations.length > 0) {
      recommendations.push('Padrões claros identificados entre saúde e medicação - mantenha consistência.');
    }

    // Based on heart rate patterns
    const hrCorrelations = correlations.filter(c => 
      c.variable1.includes('heart_rate') || c.variable2.includes('heart_rate')
    );
    if (hrCorrelations.length > 2) {
      recommendations.push('Monitoramento cardíaco mostra correlações - considere otimização da dose.');
    }

    // Based on sleep patterns
    const sleepCorrelations = correlations.filter(c => 
      c.variable1.includes('sleep') || c.variable2.includes('sleep')
    );
    if (sleepCorrelations.length > 0) {
      recommendations.push('Qualidade do sono impacta outros parâmetros - priorize higiene do sono.');
    }

    return recommendations.length > 0 ? recommendations : [
      'Continue monitoramento regular para identificar padrões.',
      'Dados insuficientes para recomendações específicas - colete mais informações.'
    ];
  }

  /**
   * Save comprehensive final report
   */
  private static async saveFinalReport(summary: any, healthExport: any): Promise<void> {
    const { writeFile } = await import('fs').then(m => m.promises);
    const { join } = await import('path');
    
    const outputPath = '/root/CODEX/mood-pharma-tracker/public/data/health';
    
    // Save detailed summary
    await writeFile(
      join(outputPath, 'complete-health-analysis.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // Save executive summary (readable format)
    const execSummary = this.formatExecutiveSummary(summary);
    await writeFile(
      join(outputPath, 'executive-summary.md'),
      execSummary
    );
    
    console.log('📄 Relatórios salvos: complete-health-analysis.json, executive-summary.md');
  }

  /**
   * Format executive summary as markdown
   */
  private static formatExecutiveSummary(summary: any): string {
    const date = new Date().toLocaleDateString('pt-BR');
    
    return `# Relatório Executivo - Análise de Saúde Integrada

**Data da Análise:** ${date}

## 📊 Visão Geral

- **Registros de Saúde:** ${summary.overview.totalHealthRecords.toLocaleString()}
- **Sessões Analisadas:** ${summary.overview.totalHealthSessions}
- **Score Médio de Saúde:** ${summary.overview.averageHealthScore}/100
- **Período:** ${summary.overview.dateRange?.start || 'N/A'} até ${summary.overview.dateRange?.end || 'N/A'}

## 📈 Dados Coletados

${Object.entries(summary.dataBreakdown).map(([type, count]) => 
  `- **${this.formatDataType(type)}:** ${count} registros`
).join('\n')}

## 💡 Principais Insights

${summary.topInsights.map((insight: any, i: number) => 
  `### ${i + 1}. ${insight.title}\n${insight.description}\n**Confiança:** ${(insight.confidence * 100).toFixed(0)}%\n`
).join('\n')}

## 🔗 Correlações Significativas

${summary.significantCorrelations.slice(0, 5).map((corr: any, i: number) => 
  `${i + 1}. **${this.formatVariableName(corr.variable1)}** ↔ **${this.formatVariableName(corr.variable2)}**\n   - Correlação: ${corr.correlation.toFixed(3)} (p=${corr.significance.toFixed(3)})\n   - Pontos de dados: ${corr.dataPoints}\n`
).join('\n')}

## 🎯 Recomendações

${summary.recommendations.map((rec: string, i: number) => `${i + 1}. ${rec}`).join('\n')}

## 🔧 Próximos Passos

1. Continue o monitoramento regular dos parâmetros de saúde
2. Implemente as recomendações identificadas
3. Revise periodicamente os padrões de correlação
4. Consulte profissionais de saúde para ajustes no tratamento

---

*Relatório gerado automaticamente pelo Sistema de Análise de Saúde Integrada*
`;
  }

  // Helper methods
  private static formatVariableName(variable: string): string {
    const mappings: Record<string, string> = {
      'heart_rate_avg': 'FC Média',
      'heart_rate_resting': 'FC Repouso',
      'heart_rate_variation': 'Variação FC',
      'sleep_efficiency': 'Eficiência Sono',
      'sleep_deep_percentage': 'Sono Profundo %',
      'sleep_rem_percentage': 'Sono REM %',
      'activity_level': 'Nível Atividade',
      'activity_steps': 'Passos',
      'mood_score': 'Humor',
      'anxiety_level': 'Ansiedade',
      'energy_level': 'Energia',
      'focus_level': 'Foco',
      'overall_health_score': 'Score Saúde Geral'
    };

    // Check for medication concentration variables
    const medMatch = variable.match(/medication_concentration_(.+)/);
    if (medMatch) {
      return `[${medMatch[1].replace(/_/g, ' ')}] Concentração`;
    }

    return mappings[variable] || variable.replace(/_/g, ' ');
  }

  private static formatDataType(type: string): string {
    const mappings: Record<string, string> = {
      'heart-rate': 'Frequência Cardíaca',
      'activity': 'Atividade Física', 
      'sleep': 'Sono',
      'hrv': 'Variabilidade FC',
      'stress': 'Estresse',
      'blood-pressure': 'Pressão Arterial'
    };

    return mappings[type] || type;
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('complete-health-analysis.ts')) {
  CompleteHealthAnalysis.runCompleteAnalysis()
    .then(() => {
      console.log('\n🎉 Análise completa finalizada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro na análise completa:', error);
      process.exit(1);
    });
}