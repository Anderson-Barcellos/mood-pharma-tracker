import { HealthDataProcessor } from './process-health-data';
import { MedicationHealthIntegration } from './medication-health-integration';
import { CorrelationEngine } from './correlation-engine';
import { writeFile } from 'fs/promises';
import { join } from 'path';

/**
 * Demo version of complete health analysis that works in Node.js environment
 * (without IndexedDB dependencies)
 */
export class HealthAnalysisDemo {

  /**
   * Run analysis demo with mock medication/mood data
   */
  static async runAnalysisDemo(): Promise<void> {
    console.log('🎬 DEMO: Análise Integrada de Dados de Saúde');
    console.log('===========================================\n');
    
    try {
      // Step 1: Process Samsung Health data
      console.log('📊 ETAPA 1: Processando dados do Samsung Health');
      const healthExport = await HealthDataProcessor.processAllHealthData();
      
      // Step 2: Create mock medication and mood data for correlation demo
      console.log('\n🧪 ETAPA 2: Simulando dados de medicação e humor');
      const mockData = this.createMockMedicationMoodData(healthExport.sessions);
      
      // Step 3: Run correlation analysis
      console.log('\n🔍 ETAPA 3: Análise de correlações integradas');
      const correlationResults = await this.runCorrelationAnalysis(
        healthExport.sessions,
        mockData.medications,
        mockData.doses,
        mockData.moodEntries
      );
      
      // Step 4: Generate insights
      console.log('\n💡 ETAPA 4: Geração de insights');
      const insights = CorrelationEngine.generateInsights(correlationResults.allCorrelations);
      
      // Step 5: Create comprehensive report
      console.log('\n📋 ETAPA 5: Gerando relatório final');
      const report = await this.generateDemoReport(
        healthExport,
        correlationResults,
        insights,
        mockData
      );
      
      // Save report
      await this.saveReport(report);
      
      console.log('\n✅ DEMO CONCLUÍDO COM SUCESSO!');
      console.log('📁 Relatório salvo: public/data/health/demo-analysis-report.json');
      
    } catch (error) {
      console.error('\n❌ Erro durante demo:', error);
      throw error;
    }
  }

  /**
   * Create realistic mock medication and mood data
   */
  private static createMockMedicationMoodData(healthSessions: any[]): {
    medications: any[];
    doses: any[];
    moodEntries: any[];
  } {
    // Mock medications (typical psychiatric medications)
    const medications = [
      {
        id: 'med-sertraline',
        name: 'Sertralina',
        category: 'antidepressant',
        halfLife: 26,
        volumeOfDistribution: 20,
        bioavailability: 0.44,
        absorptionRate: 1.2,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'med-melatonin',
        name: 'Melatonina',
        category: 'sleep_aid',
        halfLife: 0.5,
        volumeOfDistribution: 1.0,
        bioavailability: 0.15,
        absorptionRate: 6.0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // Generate doses for each day in health sessions
    const doses: any[] = [];
    const moodEntries: any[] = [];
    
    healthSessions.forEach((session, index) => {
      const sessionDate = new Date(session.date);
      
      // Morning Sertraline dose (8 AM)
      const morningTime = new Date(sessionDate);
      morningTime.setHours(8, 0, 0, 0);
      doses.push({
        id: `dose-sertraline-${session.date}`,
        medicationId: 'med-sertraline',
        timestamp: morningTime.getTime(),
        doseAmount: 50, // 50mg
        route: 'oral',
        notes: 'Dose matinal',
        createdAt: Date.now()
      });

      // Evening Melatonin dose (22 PM) 
      const eveningTime = new Date(sessionDate);
      eveningTime.setHours(22, 0, 0, 0);
      doses.push({
        id: `dose-melatonin-${session.date}`,
        medicationId: 'med-melatonin',
        timestamp: eveningTime.getTime(),
        doseAmount: 3, // 3mg
        route: 'oral',
        notes: 'Dose noturna',
        createdAt: Date.now()
      });

      // Mock mood entries (correlate with health scores)
      const moodTime = new Date(sessionDate);
      moodTime.setHours(14, 0, 0, 0); // 2 PM mood check
      
      // Correlate mood with health scores (add some noise)
      const baseScore = Math.min(10, Math.max(1, Math.round(session.overallScore / 10)));
      const moodVariation = Math.random() * 2 - 1; // -1 to +1
      
      moodEntries.push({
        id: `mood-${session.date}`,
        timestamp: moodTime.getTime(),
        moodScore: Math.max(1, Math.min(10, baseScore + moodVariation)),
        anxietyLevel: Math.max(1, Math.min(10, 11 - baseScore + moodVariation)), // Inverted
        energyLevel: Math.max(1, Math.min(10, baseScore + moodVariation * 0.5)),
        focusLevel: Math.max(1, Math.min(10, baseScore + moodVariation * 0.7)),
        notes: `Humor do dia ${index + 1}`,
        createdAt: Date.now()
      });
    });

    console.log(`  💊 ${medications.length} medicações simuladas`);
    console.log(`  💉 ${doses.length} doses simuladas`);
    console.log(`  😊 ${moodEntries.length} registros de humor simulados`);

    return { medications, doses, moodEntries };
  }

  /**
   * Run comprehensive correlation analysis
   */
  private static async runCorrelationAnalysis(
    healthSessions: any[],
    medications: any[],
    doses: any[], 
    moodEntries: any[]
  ): Promise<{
    healthMoodCorrelations: any[];
    healthMedicationCorrelations: any[];
    moodMedicationCorrelations: any[];
    allCorrelations: any[];
  }> {
    // Health-mood correlations
    const healthMoodCorrelations = CorrelationEngine.analyzeHealthMoodCorrelations(
      healthSessions, moodEntries
    );

    // Health-medication correlations  
    const healthMedicationCorrelations = await MedicationHealthIntegration.analyzeHealthMedicationCorrelations(
      healthSessions, medications, doses
    );

    // Mock mood-medication correlations (would use real calculation in production)
    const moodMedicationCorrelations = this.mockMoodMedicationCorrelations();

    const allCorrelations = [
      ...healthMoodCorrelations,
      ...healthMedicationCorrelations,
      ...moodMedicationCorrelations
    ];

    console.log(`  🔗 Saúde ↔ Humor: ${healthMoodCorrelations.length} correlações`);
    console.log(`  💊 Saúde ↔ Medicação: ${healthMedicationCorrelations.length} correlações`);
    console.log(`  😊 Humor ↔ Medicação: ${moodMedicationCorrelations.length} correlações`);
    console.log(`  📊 Total: ${allCorrelations.length} correlações identificadas`);

    return {
      healthMoodCorrelations,
      healthMedicationCorrelations,
      moodMedicationCorrelations,
      allCorrelations
    };
  }

  /**
   * Mock mood-medication correlations for demo
   */
  private static mockMoodMedicationCorrelations(): any[] {
    return [
      {
        id: 'mock-corr-1',
        variable1: 'medication_concentration_sertralina',
        variable2: 'mood_score',
        correlation: 0.72,
        significance: 0.03,
        dataPoints: 7,
        timeframe: 'daily',
        createdAt: Date.now()
      },
      {
        id: 'mock-corr-2',
        variable1: 'medication_concentration_sertralina',
        variable2: 'anxiety_level',
        correlation: -0.68,
        significance: 0.04,
        dataPoints: 7,
        timeframe: 'daily',
        createdAt: Date.now()
      },
      {
        id: 'mock-corr-3',
        variable1: 'medication_concentration_melatonina',
        variable2: 'sleep_efficiency',
        correlation: 0.81,
        significance: 0.01,
        dataPoints: 7,
        timeframe: 'daily',
        createdAt: Date.now()
      }
    ];
  }

  /**
   * Generate comprehensive demo report
   */
  private static async generateDemoReport(
    healthExport: any,
    correlationResults: any,
    insights: any[],
    mockData: any
  ): Promise<any> {
    const report = {
      meta: {
        title: 'Análise Integrada de Dados de Saúde - DEMO',
        generatedAt: new Date().toISOString(),
        version: '1.0.0-demo',
        dataSource: 'Samsung Health + Mock Data'
      },
      
      healthSummary: {
        totalRecords: healthExport.records.length,
        totalSessions: healthExport.sessions.length,
        dateRange: {
          start: healthExport.sessions[0]?.date,
          end: healthExport.sessions[healthExport.sessions.length - 1]?.date
        },
        averageHealthScore: Math.round(
          healthExport.sessions.reduce((sum: number, s: any) => sum + s.overallScore, 0) / 
          healthExport.sessions.length
        ),
        recordsByType: this.countRecordsByType(healthExport.records)
      },

      medicationSummary: {
        totalMedications: mockData.medications.length,
        totalDoses: mockData.doses.length,
        medications: mockData.medications.map((m: any) => ({
          name: m.name,
          category: m.category,
          halfLife: m.halfLife
        }))
      },

      correlationAnalysis: {
        totalCorrelations: correlationResults.allCorrelations.length,
        significantCorrelations: correlationResults.allCorrelations.filter(
          (c: any) => Math.abs(c.correlation) > 0.5 && c.significance < 0.05
        ).length,
        strongestCorrelations: correlationResults.allCorrelations
          .sort((a: any, b: any) => Math.abs(b.correlation) - Math.abs(a.correlation))
          .slice(0, 5),
        byCategory: {
          healthMood: correlationResults.healthMoodCorrelations.length,
          healthMedication: correlationResults.healthMedicationCorrelations.length,
          moodMedication: correlationResults.moodMedicationCorrelations.length
        }
      },

      insights: {
        total: insights.length,
        topInsights: insights.slice(0, 3),
        actionableInsights: insights.filter(i => i.actionable).length
      },

      recommendations: this.generateDemoRecommendations(correlationResults, insights),

      rawData: {
        healthSessions: healthExport.sessions,
        correlations: correlationResults.allCorrelations,
        insights: insights
      }
    };

    return report;
  }

  /**
   * Count records by type
   */
  private static countRecordsByType(records: any[]): Record<string, number> {
    return records.reduce((counts, record) => {
      counts[record.type] = (counts[record.type] || 0) + 1;
      return counts;
    }, {});
  }

  /**
   * Generate demo recommendations
   */
  private static generateDemoRecommendations(correlationResults: any, insights: any[]): string[] {
    const recommendations: string[] = [];

    const strongCorrelations = correlationResults.allCorrelations.filter(
      (c: any) => Math.abs(c.correlation) > 0.6
    );

    if (strongCorrelations.length > 0) {
      recommendations.push('🎯 Padrões consistentes identificados - mantenha rotina atual de medicação');
    }

    const sleepCorrelations = correlationResults.allCorrelations.filter(
      (c: any) => c.variable1.includes('sleep') || c.variable2.includes('sleep')
    );

    if (sleepCorrelations.length > 0) {
      recommendations.push('😴 Qualidade do sono correlaciona com outros parâmetros - otimize higiene do sono');
    }

    const heartRateCorrelations = correlationResults.allCorrelations.filter(
      (c: any) => c.variable1.includes('heart') || c.variable2.includes('heart')
    );

    if (heartRateCorrelations.length > 0) {
      recommendations.push('❤️ Frequência cardíaca mostra padrões - considere monitoramento cardíaco contínuo');
    }

    if (insights.some(i => i.confidence > 0.8)) {
      recommendations.push('🔬 Insights de alta confiança detectados - discuta achados com médico');
    }

    recommendations.push('📊 Continue coleta de dados para aumentar precisão das análises');
    recommendations.push('🔄 Execute análises semanais para acompanhar tendências');

    return recommendations;
  }

  /**
   * Save report to file
   */
  private static async saveReport(report: any): Promise<void> {
    const outputPath = '/root/CODEX/mood-pharma-tracker/public/data/health';
    
    // Save comprehensive JSON report
    await writeFile(
      join(outputPath, 'demo-analysis-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Save summary markdown report
    const markdownReport = this.generateMarkdownSummary(report);
    await writeFile(
      join(outputPath, 'demo-analysis-summary.md'),
      markdownReport
    );

    console.log('📄 Relatórios salvos:');
    console.log('  - demo-analysis-report.json (dados completos)');
    console.log('  - demo-analysis-summary.md (resumo executivo)');
  }

  /**
   * Generate markdown summary
   */
  private static generateMarkdownSummary(report: any): string {
    return `# 🏥 Análise Integrada de Dados de Saúde - DEMO

**Gerado em:** ${new Date(report.meta.generatedAt).toLocaleString('pt-BR')}

## 📊 Resumo Executivo

### Dados Processados
- **Registros de Saúde:** ${report.healthSummary.totalRecords.toLocaleString()}
- **Sessões Analisadas:** ${report.healthSummary.totalSessions}
- **Score Médio de Saúde:** ${report.healthSummary.averageHealthScore}/100
- **Período:** ${report.healthSummary.dateRange.start} → ${report.healthSummary.dateRange.end}

### Medicações
${report.medicationSummary.medications.map((m: any) => 
  `- **${m.name}** (${m.category}) - Meia-vida: ${m.halfLife}h`
).join('\n')}

## 🔍 Análise de Correlações

**Total de correlações encontradas:** ${report.correlationAnalysis.totalCorrelations}
**Correlações significativas:** ${report.correlationAnalysis.significantCorrelations}

### Top 5 Correlações Mais Fortes
${report.correlationAnalysis.strongestCorrelations.map((corr: any, i: number) => 
  `${i+1}. **${this.formatVarName(corr.variable1)}** ↔ **${this.formatVarName(corr.variable2)}**\n   - Correlação: ${corr.correlation.toFixed(3)} (p=${corr.significance.toFixed(3)})\n   - Dados: ${corr.dataPoints} pontos`
).join('\n\n')}

## 💡 Principais Insights

${report.insights.topInsights.map((insight: any, i: number) => 
  `### ${i+1}. ${insight.title}\n${insight.description}\n**Confiança:** ${(insight.confidence * 100).toFixed(0)}%`
).join('\n\n')}

## 🎯 Recomendações

${report.recommendations.map((rec: string, i: number) => `${i+1}. ${rec}`).join('\n')}

## 📈 Próximos Passos

1. **Coleta Contínua:** Mantenha registro diário dos parâmetros
2. **Análise Periódica:** Execute análises semanais para acompanhar tendências  
3. **Consulta Médica:** Discuta os padrões identificados com profissional de saúde
4. **Otimização:** Implemente recomendações baseadas nas correlações encontradas

---

> ⚠️ **IMPORTANTE:** Este é um relatório de demonstração com dados simulados para medicação e humor. Em ambiente de produção, use dados reais do sistema.

*Sistema de Análise de Saúde Integrada - Mood & Pharma Tracker*
`;
  }

  private static formatVarName(variable: string): string {
    const mappings: { [key: string]: string } = {
      'heart_rate_avg': 'FC Média',
      'heart_rate_resting': 'FC Repouso', 
      'sleep_efficiency': 'Eficiência Sono',
      'mood_score': 'Humor',
      'anxiety_level': 'Ansiedade',
      'medication_concentration_sertralina': 'Concentração Sertralina',
      'medication_concentration_melatonina': 'Concentração Melatonina'
    };

    return mappings[variable] || variable.replace(/_/g, ' ');
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('analysis-demo.ts')) {
  HealthAnalysisDemo.runAnalysisDemo()
    .then(() => {
      console.log('\n🎊 Demo concluído! Verifique os arquivos de relatório gerados.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro no demo:', error);
      process.exit(1);
    });
}