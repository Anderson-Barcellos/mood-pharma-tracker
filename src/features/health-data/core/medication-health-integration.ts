import { HealthSession, HealthCorrelation, HealthInsight } from './types';
import { CorrelationEngine } from './correlation-engine';
import { calculateConcentration } from '../../analytics/utils/pharmacokinetics';
import type { Medication, MedicationDose, MoodEntry } from '@/shared/types';

/**
 * Integration between health data, medication concentrations, and mood tracking
 */
export class MedicationHealthIntegration {

  /**
   * Calculate medication concentrations for each health session
   */
  static calculateHealthSessionConcentrations(
    healthSessions: HealthSession[],
    medications: Medication[],
    doses: MedicationDose[]
  ): Array<{
    session: HealthSession;
    medicationConcentrations: Array<{
      medicationId: string;
      medicationName: string;
      concentration: number; // ng/mL
      peakTime: boolean; // True if within 2 hours of peak
      troughTime: boolean; // True if within 2 hours of trough
    }>;
  }> {
    const results: Array<any> = [];

    for (const session of healthSessions) {
      // Use middle of the day (12:00) as representative time for daily session
      const sessionTime = new Date(`${session.date}T12:00:00`).getTime();
      
      const medicationConcentrations = medications.map(medication => {
        const relevantDoses = doses.filter(dose => dose.medicationId === medication.id);
        const concentration = calculateConcentration(medication, relevantDoses, sessionTime);
        
        // Determine if we're near peak or trough
        const { peakTime, troughTime } = this.determinePeakTroughStatus(
          medication, relevantDoses, sessionTime
        );

        return {
          medicationId: medication.id,
          medicationName: medication.name,
          concentration,
          peakTime,
          troughTime
        };
      });

      results.push({
        session,
        medicationConcentrations: medicationConcentrations.filter(m => m.concentration > 0)
      });
    }

    return results;
  }

  /**
   * Analyze correlations between health metrics and medication concentrations
   */
  static async analyzeHealthMedicationCorrelations(
    healthSessions: HealthSession[],
    medications: Medication[],
    doses: MedicationDose[]
  ): Promise<HealthCorrelation[]> {
    const correlations: HealthCorrelation[] = [];

    // Get medication concentrations for each session
    const sessionConcentrations = this.calculateHealthSessionConcentrations(
      healthSessions, medications, doses
    );

    // Filter sessions that have both health data and medication concentrations
    const validSessions = sessionConcentrations.filter(
      sc => sc.medicationConcentrations.length > 0 && 
           (sc.session.heartRateMetrics || sc.session.activityMetrics || sc.session.sleepMetrics)
    );

    if (validSessions.length < 3) {
      console.warn('Dados insuficientes para correlação saúde-medicação');
      return correlations;
    }

    // Define health metrics to analyze
    const healthMetrics = [
      { 
        key: 'heart_rate_avg', 
        name: 'FC Média',
        extractor: (session: HealthSession) => session.heartRateMetrics?.averageHR 
      },
      { 
        key: 'heart_rate_resting', 
        name: 'FC Repouso',
        extractor: (session: HealthSession) => session.heartRateMetrics?.restingHR 
      },
      { 
        key: 'heart_rate_variation', 
        name: 'Variação FC',
        extractor: (session: HealthSession) => session.heartRateMetrics?.maxHRVariation 
      },
      { 
        key: 'sleep_efficiency', 
        name: 'Eficiência do Sono',
        extractor: (session: HealthSession) => session.sleepMetrics?.sleepEfficiency 
      },
      { 
        key: 'sleep_deep_percentage', 
        name: 'Sono Profundo %',
        extractor: (session: HealthSession) => session.sleepMetrics?.deepSleepPercentage 
      },
      { 
        key: 'activity_level', 
        name: 'Nível de Atividade',
        extractor: (session: HealthSession) => session.activityMetrics?.averageActivityLevel 
      },
      {
        key: 'overall_health_score',
        name: 'Score Geral de Saúde', 
        extractor: (session: HealthSession) => session.overallScore
      }
    ];

    // For each medication
    for (const medication of medications) {
      const medicationSessions = validSessions.filter(
        sc => sc.medicationConcentrations.some(mc => mc.medicationId === medication.id)
      );

      if (medicationSessions.length < 3) continue;

      // For each health metric
      for (const healthMetric of healthMetrics) {
        const healthValues: number[] = [];
        const concentrationValues: number[] = [];

        for (const sessionData of medicationSessions) {
          const healthValue = healthMetric.extractor(sessionData.session);
          const medConc = sessionData.medicationConcentrations.find(
            mc => mc.medicationId === medication.id
          );

          if (healthValue !== undefined && medConc && medConc.concentration > 0) {
            healthValues.push(healthValue);
            concentrationValues.push(medConc.concentration);
          }
        }

        if (healthValues.length >= 3) {
          const result = CorrelationEngine.calculateCorrelation(
            healthValues, concentrationValues
          );

          // Only save significant correlations
          if (Math.abs(result.correlation) > 0.3 && result.significance < 0.15) {
            correlations.push({
              id: `med-health-corr-${medication.id}-${healthMetric.key}-${Date.now()}`,
              variable1: `medication_concentration_${medication.name.toLowerCase().replace(/\s/g, '_')}`,
              variable2: healthMetric.key,
              correlation: result.correlation,
              significance: result.significance,
              dataPoints: healthValues.length,
              timeframe: 'daily',
              createdAt: Date.now()
            });
          }
        }
      }
    }

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Analyze comprehensive correlations including mood data
   */
  static async analyzeComprehensiveCorrelations(
    healthSessions: HealthSession[],
    medications: Medication[],
    doses: MedicationDose[],
    moodEntries: MoodEntry[]
  ): Promise<{
    healthMoodCorrelations: HealthCorrelation[];
    healthMedicationCorrelations: HealthCorrelation[];
    moodMedicationCorrelations: HealthCorrelation[];
    insights: HealthInsight[];
  }> {
    // Health-mood correlations
    const healthMoodCorrelations = CorrelationEngine.analyzeHealthMoodCorrelations(
      healthSessions, moodEntries
    );

    // Health-medication correlations
    const healthMedicationCorrelations = await this.analyzeHealthMedicationCorrelations(
      healthSessions, medications, doses
    );

    // Mood-medication correlations (using existing pharmacokinetic system)
    const moodMedicationCorrelations = await this.analyzeMoodMedicationCorrelations(
      moodEntries, medications, doses
    );

    // Generate comprehensive insights
    const allCorrelations = [
      ...healthMoodCorrelations,
      ...healthMedicationCorrelations,
      ...moodMedicationCorrelations
    ];

    const insights = this.generateAdvancedInsights(allCorrelations, medications);

    return {
      healthMoodCorrelations,
      healthMedicationCorrelations,
      moodMedicationCorrelations,
      insights
    };
  }

  /**
   * Analyze mood-medication correlations
   */
  private static async analyzeMoodMedicationCorrelations(
    moodEntries: MoodEntry[],
    medications: Medication[],
    doses: MedicationDose[]
  ): Promise<HealthCorrelation[]> {
    const correlations: HealthCorrelation[] = [];

    // Group mood entries by day for consistency with health sessions
    const moodByDate = this.groupMoodEntriesByDate(moodEntries);
    
    const moodMetrics = [
      { key: 'mood_score', name: 'Humor', extractor: (entries: MoodEntry[]) => this.averageMoodMetric(entries, 'moodScore') },
      { key: 'anxiety_level', name: 'Ansiedade', extractor: (entries: MoodEntry[]) => this.averageMoodMetric(entries, 'anxietyLevel') },
      { key: 'energy_level', name: 'Energia', extractor: (entries: MoodEntry[]) => this.averageMoodMetric(entries, 'energyLevel') },
      { key: 'focus_level', name: 'Foco', extractor: (entries: MoodEntry[]) => this.averageMoodMetric(entries, 'focusLevel') }
    ];

    for (const medication of medications) {
      const relevantDoses = doses.filter(dose => dose.medicationId === medication.id);
      if (relevantDoses.length === 0) continue;

      for (const moodMetric of moodMetrics) {
        const moodValues: number[] = [];
        const concentrationValues: number[] = [];

        for (const [date, moodEntriesForDate] of moodByDate.entries()) {
          const moodValue = moodMetric.extractor(moodEntriesForDate);
          if (moodValue === undefined) continue;

          // Calculate medication concentration at midday for that date
          const midday = new Date(`${date}T12:00:00`).getTime();
          const concentration = calculateConcentration(medication, relevantDoses, midday);

          if (concentration > 0) {
            moodValues.push(moodValue);
            concentrationValues.push(concentration);
          }
        }

        if (moodValues.length >= 3) {
          const result = CorrelationEngine.calculateCorrelation(moodValues, concentrationValues);

          if (Math.abs(result.correlation) > 0.3 && result.significance < 0.15) {
            correlations.push({
              id: `mood-med-corr-${medication.id}-${moodMetric.key}-${Date.now()}`,
              variable1: `medication_concentration_${medication.name.toLowerCase().replace(/\s/g, '_')}`,
              variable2: moodMetric.key,
              correlation: result.correlation,
              significance: result.significance,
              dataPoints: moodValues.length,
              timeframe: 'daily',
              createdAt: Date.now()
            });
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Generate advanced insights combining all correlation data
   */
  private static generateAdvancedInsights(
    correlations: HealthCorrelation[],
    medications: Medication[]
  ): HealthInsight[] {
    const insights: HealthInsight[] = [];

    // Group correlations by medication
    const correlationsByMed = new Map<string, HealthCorrelation[]>();
    
    correlations.forEach(corr => {
      const medName = this.extractMedicationFromVariable(corr.variable1) || 
                     this.extractMedicationFromVariable(corr.variable2);
      if (medName) {
        if (!correlationsByMed.has(medName)) {
          correlationsByMed.set(medName, []);
        }
        correlationsByMed.get(medName)!.push(corr);
      }
    });

    // Generate medication-specific insights
    for (const [medName, medCorrelations] of correlationsByMed.entries()) {
      const strongCorrelations = medCorrelations.filter(
        c => Math.abs(c.correlation) > 0.5 && c.significance < 0.05
      );

      if (strongCorrelations.length > 0) {
        const positiveEffects = strongCorrelations.filter(c => this.isPositiveHealthEffect(c));
        const negativeEffects = strongCorrelations.filter(c => this.isNegativeHealthEffect(c));

        if (positiveEffects.length > 0 || negativeEffects.length > 0) {
          let description = `Análise detalhada do ${medName}: `;
          
          if (positiveEffects.length > 0) {
            const effects = positiveEffects.map(c => this.describeCorrelation(c)).join(', ');
            description += `Efeitos positivos em ${effects}. `;
          }
          
          if (negativeEffects.length > 0) {
            const effects = negativeEffects.map(c => this.describeCorrelation(c)).join(', ');
            description += `Possíveis efeitos em ${effects}. `;
          }

          insights.push({
            id: `insight-medication-${medName}-${Date.now()}`,
            type: 'correlation',
            title: `Perfil Farmacológico - ${medName}`,
            description: description.trim(),
            confidence: Math.min(...strongCorrelations.map(c => 1 - c.significance)),
            relevantMetrics: strongCorrelations.map(c => [c.variable1, c.variable2]).flat(),
            actionable: true,
            createdAt: Date.now()
          });
        }
      }
    }

    // Generate cross-system insights
    const multiSystemCorrelations = correlations.filter(c => 
      (c.variable1.includes('heart_rate') || c.variable2.includes('heart_rate')) &&
      (c.variable1.includes('sleep') || c.variable2.includes('sleep'))
    );

    if (multiSystemCorrelations.length > 0) {
      insights.push({
        id: `insight-multi-system-${Date.now()}`,
        type: 'correlation',
        title: 'Interações Multi-Sistema Detectadas',
        description: 'Identificamos correlações entre sistemas cardiovascular, sono e medicação que indicam efeitos sistêmicos.',
        confidence: 0.8,
        relevantMetrics: ['heart_rate_avg', 'sleep_efficiency', 'medication_concentration'],
        actionable: true,
        createdAt: Date.now()
      });
    }

    return insights;
  }

  // Helper methods
  private static determinePeakTroughStatus(
    medication: Medication,
    doses: MedicationDose[],
    targetTime: number
  ): { peakTime: boolean; troughTime: boolean } {
    // Find most recent dose
    const recentDoses = doses
      .filter(dose => dose.timestamp <= targetTime)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentDoses.length === 0) {
      return { peakTime: false, troughTime: false };
    }

    const lastDose = recentDoses[0];
    const timeSinceLastDose = (targetTime - lastDose.timestamp) / (1000 * 3600); // hours

    // Peak typically occurs 1-4 hours after dose for most oral medications
    const peakTime = timeSinceLastDose >= 1 && timeSinceLastDose <= 4;
    
    // Trough occurs just before next dose (assuming 12-24h intervals)
    const troughTime = timeSinceLastDose >= (medication.halfLife * 2) && 
                      timeSinceLastDose <= (medication.halfLife * 3);

    return { peakTime, troughTime };
  }

  private static groupMoodEntriesByDate(moodEntries: MoodEntry[]): Map<string, MoodEntry[]> {
    const grouped = new Map<string, MoodEntry[]>();
    
    moodEntries.forEach(entry => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(entry);
    });

    return grouped;
  }

  private static averageMoodMetric(entries: MoodEntry[], metric: keyof MoodEntry): number {
    const values = entries.map(entry => entry[metric] as number).filter(v => typeof v === 'number');
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private static extractMedicationFromVariable(variable: string): string | null {
    const match = variable.match(/medication_concentration_(.+)/);
    return match ? match[1].replace(/_/g, ' ') : null;
  }

  private static isPositiveHealthEffect(correlation: HealthCorrelation): boolean {
    const healthMetrics = ['sleep_efficiency', 'activity_level', 'overall_health_score', 'mood_score', 'energy_level', 'focus_level'];
    const negativeMetrics = ['anxiety_level', 'heart_rate_variation'];
    
    const isHealthMetric = healthMetrics.some(metric => 
      correlation.variable1.includes(metric) || correlation.variable2.includes(metric)
    );
    
    const isNegativeMetric = negativeMetrics.some(metric =>
      correlation.variable1.includes(metric) || correlation.variable2.includes(metric)
    );

    return (isHealthMetric && correlation.correlation > 0) || 
           (isNegativeMetric && correlation.correlation < 0);
  }

  private static isNegativeHealthEffect(correlation: HealthCorrelation): boolean {
    const healthMetrics = ['sleep_efficiency', 'activity_level', 'overall_health_score', 'mood_score', 'energy_level', 'focus_level'];
    const negativeMetrics = ['anxiety_level', 'heart_rate_variation'];
    
    const isHealthMetric = healthMetrics.some(metric => 
      correlation.variable1.includes(metric) || correlation.variable2.includes(metric)
    );
    
    const isNegativeMetric = negativeMetrics.some(metric =>
      correlation.variable1.includes(metric) || correlation.variable2.includes(metric)
    );

    return (isHealthMetric && correlation.correlation < 0) || 
           (isNegativeMetric && correlation.correlation > 0);
  }

  private static describeCorrelation(correlation: HealthCorrelation): string {
    const variable = correlation.variable2.includes('heart') ? 'frequência cardíaca' :
                    correlation.variable2.includes('sleep') ? 'qualidade do sono' :
                    correlation.variable2.includes('activity') ? 'atividade física' :
                    correlation.variable2.includes('mood') ? 'humor' :
                    correlation.variable2.includes('anxiety') ? 'ansiedade' :
                    correlation.variable2.includes('energy') ? 'energia' :
                    correlation.variable2.includes('focus') ? 'concentração' : 'saúde geral';
    
    return variable;
  }
}