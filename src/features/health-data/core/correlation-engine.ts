import { 
  BaseHealthRecord, 
  HealthCorrelation, 
  HealthInsight, 
  HealthSession 
} from './types';
import type { MoodEntry, MedicationDose, Medication } from '@/shared/types';

/**
 * Advanced correlation engine for health data, medication, and mood analysis
 */
export class CorrelationEngine {
  
  /**
   * Calculate Pearson correlation coefficient between two datasets
   */
  static calculateCorrelation(x: number[], y: number[]): { correlation: number; significance: number } {
    if (x.length !== y.length || x.length < 3) {
      return { correlation: 0, significance: 1 };
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

    // Calculate t-statistic for significance testing
    const tStat = Math.abs(correlation) * Math.sqrt((n - 2) / (1 - correlation * correlation));
    const significance = this.calculatePValue(tStat, n - 2);

    return {
      correlation: Math.round(correlation * 1000) / 1000,
      significance: Math.round(significance * 1000) / 1000
    };
  }

  /**
   * Approximate p-value calculation using t-distribution
   */
  private static calculatePValue(tStat: number, degreesOfFreedom: number): number {
    if (degreesOfFreedom < 1) return 1;
    
    // Simplified p-value approximation
    // For more accurate results, would need full t-distribution implementation
    const criticalValues: { [key: number]: number } = {
      1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
      6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228
    };

    const criticalValue = criticalValues[Math.min(degreesOfFreedom, 10)] || 2.0;
    
    if (tStat >= criticalValue) return 0.01; // p < 0.01
    if (tStat >= criticalValue * 0.7) return 0.05; // p < 0.05
    if (tStat >= criticalValue * 0.5) return 0.1; // p < 0.1
    
    return Math.min(1, 0.5 - (tStat / criticalValue) * 0.3);
  }

  /**
   * Find correlations between health metrics and mood
   */
  static analyzeHealthMoodCorrelations(
    healthSessions: HealthSession[],
    moodEntries: MoodEntry[]
  ): HealthCorrelation[] {
    const correlations: HealthCorrelation[] = [];
    
    // Align data by date
    const alignedData = this.alignHealthMoodData(healthSessions, moodEntries);
    
    if (alignedData.length < 3) {
      console.warn('Dados insuficientes para análise de correlação');
      return correlations;
    }

    // Define health metrics to analyze
    const healthMetrics = [
      { key: 'heart_rate_avg', extractor: (session: HealthSession) => session.heartRateMetrics?.averageHR },
      { key: 'heart_rate_resting', extractor: (session: HealthSession) => session.heartRateMetrics?.restingHR },
      { key: 'heart_rate_variation', extractor: (session: HealthSession) => session.heartRateMetrics?.maxHRVariation },
      { key: 'activity_steps', extractor: (session: HealthSession) => session.activityMetrics?.totalSteps },
      { key: 'activity_distance', extractor: (session: HealthSession) => session.activityMetrics?.totalDistance },
      { key: 'activity_calories', extractor: (session: HealthSession) => session.activityMetrics?.totalCalories },
      { key: 'activity_level', extractor: (session: HealthSession) => session.activityMetrics?.averageActivityLevel },
      { key: 'sleep_efficiency', extractor: (session: HealthSession) => session.sleepMetrics?.sleepEfficiency },
      { key: 'sleep_deep_percentage', extractor: (session: HealthSession) => session.sleepMetrics?.deepSleepPercentage },
      { key: 'sleep_rem_percentage', extractor: (session: HealthSession) => session.sleepMetrics?.remSleepPercentage },
      { key: 'sleep_total_time', extractor: (session: HealthSession) => session.sleepMetrics?.totalSleepTime }
    ];

    const moodMetrics = [
      { key: 'mood_score', extractor: (entry: MoodEntry) => entry.moodScore },
      { key: 'anxiety_level', extractor: (entry: MoodEntry) => entry.anxietyLevel },
      { key: 'energy_level', extractor: (entry: MoodEntry) => entry.energyLevel },
      { key: 'focus_level', extractor: (entry: MoodEntry) => entry.focusLevel }
    ];

    // Calculate correlations between each health metric and mood metric
    for (const healthMetric of healthMetrics) {
      for (const moodMetric of moodMetrics) {
        const healthValues: number[] = [];
        const moodValues: number[] = [];

        for (const dataPoint of alignedData) {
          const healthValue = healthMetric.extractor(dataPoint.health);
          const moodValue = moodMetric.extractor(dataPoint.mood);

          if (healthValue !== undefined && moodValue !== undefined) {
            healthValues.push(healthValue);
            moodValues.push(moodValue);
          }
        }

        if (healthValues.length >= 3) {
          const result = this.calculateCorrelation(healthValues, moodValues);
          
          if (Math.abs(result.correlation) > 0.3 && result.significance < 0.1) {
            correlations.push({
              id: `corr-${healthMetric.key}-${moodMetric.key}-${Date.now()}`,
              variable1: healthMetric.key,
              variable2: moodMetric.key,
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
   * Analyze correlations between health data and medication concentrations
   */
  static analyzeHealthMedicationCorrelations(
    healthSessions: HealthSession[],
    medications: Medication[],
    doses: MedicationDose[]
  ): HealthCorrelation[] {
    // This would integrate with the existing pharmacokinetic calculations
    // For now, returning empty array as placeholder
    console.log('Health-medication correlation analysis would be implemented here');
    return [];
  }

  /**
   * Align health sessions with mood entries by date
   */
  private static alignHealthMoodData(
    healthSessions: HealthSession[],
    moodEntries: MoodEntry[]
  ): Array<{ health: HealthSession; mood: MoodEntry; date: string }> {
    const alignedData: Array<{ health: HealthSession; mood: MoodEntry; date: string }> = [];

    // Group mood entries by date
    const moodByDate = new Map<string, MoodEntry[]>();
    moodEntries.forEach(mood => {
      const date = new Date(mood.timestamp).toISOString().split('T')[0];
      if (!moodByDate.has(date)) {
        moodByDate.set(date, []);
      }
      moodByDate.get(date)!.push(mood);
    });

    // Match health sessions with mood entries
    healthSessions.forEach(health => {
      const moodsForDate = moodByDate.get(health.date);
      if (moodsForDate && moodsForDate.length > 0) {
        // Use average mood for the day if multiple entries
        const avgMood = this.calculateAverageMood(moodsForDate);
        alignedData.push({
          health,
          mood: avgMood,
          date: health.date
        });
      }
    });

    return alignedData;
  }

  /**
   * Calculate average mood entry for multiple entries on same day
   */
  private static calculateAverageMood(moodEntries: MoodEntry[]): MoodEntry {
    const avgMood = moodEntries[0]; // Use first entry as base
    
    if (moodEntries.length === 1) return avgMood;

    // Calculate averages
    avgMood.moodScore = Math.round(
      moodEntries.reduce((sum, entry) => sum + entry.moodScore, 0) / moodEntries.length
    );
    avgMood.anxietyLevel = Math.round(
      moodEntries.reduce((sum, entry) => sum + entry.anxietyLevel, 0) / moodEntries.length
    );
    avgMood.energyLevel = Math.round(
      moodEntries.reduce((sum, entry) => sum + entry.energyLevel, 0) / moodEntries.length
    );
    avgMood.focusLevel = Math.round(
      moodEntries.reduce((sum, entry) => sum + entry.focusLevel, 0) / moodEntries.length
    );

    return avgMood;
  }

  /**
   * Generate actionable insights from correlations
   */
  static generateInsights(correlations: HealthCorrelation[]): HealthInsight[] {
    const insights: HealthInsight[] = [];

    correlations.forEach(corr => {
      if (Math.abs(corr.correlation) > 0.5 && corr.significance < 0.05) {
        let insight: HealthInsight | null = null;

        // Heart rate and mood insights
        if (corr.variable1.includes('heart_rate') && corr.variable2.includes('mood')) {
          if (corr.correlation > 0) {
            insight = {
              id: `insight-${corr.id}`,
              type: 'correlation',
              title: 'Frequência Cardíaca e Humor Correlacionados',
              description: `Observamos uma correlação positiva forte (${corr.correlation.toFixed(2)}) entre frequência cardíaca e humor. Períodos com FC elevada coincidem com melhor humor.`,
              confidence: 1 - corr.significance,
              relevantMetrics: [corr.variable1, corr.variable2],
              actionable: true,
              createdAt: Date.now()
            };
          } else {
            insight = {
              id: `insight-${corr.id}`,
              type: 'correlation',
              title: 'FC Elevada Associada a Humor Baixo',
              description: `Detectamos correlação negativa (${corr.correlation.toFixed(2)}) entre FC e humor. FC alta pode indicar ansiedade afetando o humor.`,
              confidence: 1 - corr.significance,
              relevantMetrics: [corr.variable1, corr.variable2],
              actionable: true,
              createdAt: Date.now()
            };
          }
        }

        // Activity and energy insights
        if (corr.variable1.includes('activity') && corr.variable2.includes('energy')) {
          insight = {
            id: `insight-${corr.id}`,
            type: 'correlation',
            title: 'Atividade Física Impacta Energia',
            description: `Correlação de ${corr.correlation.toFixed(2)} entre atividade física e níveis de energia. ${corr.correlation > 0 ? 'Mais atividade = mais energia' : 'Excesso de atividade pode estar causando fadiga'}.`,
            confidence: 1 - corr.significance,
            relevantMetrics: [corr.variable1, corr.variable2],
            actionable: true,
            createdAt: Date.now()
          };
        }

        // Sleep and focus insights
        if (corr.variable1.includes('sleep') && corr.variable2.includes('focus')) {
          insight = {
            id: `insight-${corr.id}`,
            type: 'correlation',
            title: 'Qualidade do Sono Afeta Foco',
            description: `${corr.variable1.includes('efficiency') ? 'Eficiência' : corr.variable1.includes('deep') ? 'Sono profundo' : 'Sono'} correlaciona ${corr.correlation.toFixed(2)} com capacidade de foco.`,
            confidence: 1 - corr.significance,
            relevantMetrics: [corr.variable1, corr.variable2],
            actionable: true,
            createdAt: Date.now()
          };
        }

        if (insight) {
          insights.push(insight);
        }
      }
    });

    return insights;
  }

  /**
   * Calculate overall health score from multiple metrics
   */
  static calculateHealthScore(session: HealthSession): number {
    let score = 0;
    let factors = 0;

    // Heart rate score (25% of total)
    if (session.heartRateMetrics) {
      const hrScore = this.calculateHeartRateScore(session.heartRateMetrics);
      score += hrScore * 0.25;
      factors++;
    }

    // Activity score (25% of total)
    if (session.activityMetrics) {
      const activityScore = this.calculateActivityScore(session.activityMetrics);
      score += activityScore * 0.25;
      factors++;
    }

    // Sleep score (30% of total)
    if (session.sleepMetrics) {
      const sleepScore = session.sleepMetrics.sleepScore || 50;
      score += sleepScore * 0.3;
      factors++;
    }

    // HRV/Stress would add 20% when available

    return factors > 0 ? Math.round(score / factors) : 50;
  }

  private static calculateHeartRateScore(hrMetrics: any): number {
    let score = 100;

    // Penalize if resting HR is too high or too low
    if (hrMetrics.restingHR > 80) score -= (hrMetrics.restingHR - 80) * 2;
    if (hrMetrics.restingHR < 50) score -= (50 - hrMetrics.restingHR) * 1.5;

    // Penalize high heart rate variation (stress indicator)
    if (hrMetrics.maxHRVariation > 20) score -= (hrMetrics.maxHRVariation - 20);

    return Math.max(0, Math.min(100, score));
  }

  private static calculateActivityScore(activityMetrics: any): number {
    let score = 0;

    // Steps score (max 40 points)
    const stepsScore = Math.min(40, (activityMetrics.totalSteps / 10000) * 40);
    score += stepsScore;

    // Activity level score (max 30 points)
    score += activityMetrics.averageActivityLevel * 3;

    // Active minutes score (max 30 points)
    score += Math.min(30, (activityMetrics.activeMinutes / 30) * 30);

    return Math.max(0, Math.min(100, score));
  }
}