import { SleepSession, SleepMetrics, SleepAnalytics } from '../types';

export class SleepAnalyzer {
  
  /**
   * Analyze multiple sleep sessions for trends and insights
   */
  static analyzeSleepTrends(sessions: SleepSession[]): SleepAnalytics {
    if (sessions.length === 0) {
      return this.getEmptyAnalytics();
    }
    
    // Sort sessions by date
    const sortedSessions = sessions.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const weeklyAverage = this.calculateAverageMetrics(
      this.getSessionsInRange(sortedSessions, 7)
    );
    
    const monthlyAverage = this.calculateAverageMetrics(
      this.getSessionsInRange(sortedSessions, 30)
    );
    
    const trends = this.calculateTrends(sortedSessions);
    const recommendations = this.generateRecommendations(sortedSessions);
    
    return {
      weeklyAverage,
      monthlyAverage,
      trends,
      recommendations
    };
  }
  
  /**
   * Calculate average metrics from a set of sessions
   */
  private static calculateAverageMetrics(sessions: SleepSession[]): Partial<SleepMetrics> {
    if (sessions.length === 0) return {};
    
    const totals = sessions.reduce((acc, session) => {
      const metrics = session.metrics;
      return {
        totalSleepTime: acc.totalSleepTime + metrics.totalSleepTime,
        sleepEfficiency: acc.sleepEfficiency + metrics.sleepEfficiency,
        deepSleepPercentage: acc.deepSleepPercentage + metrics.deepSleepPercentage,
        remSleepPercentage: acc.remSleepPercentage + metrics.remSleepPercentage,
        numberOfAwakenings: acc.numberOfAwakenings + metrics.numberOfAwakenings,
        sleepScore: acc.sleepScore + metrics.sleepScore,
        timeToDeepSleep: acc.timeToDeepSleep + metrics.timeToDeepSleep,
        timeToREM: acc.timeToREM + metrics.timeToREM
      };
    }, {
      totalSleepTime: 0,
      sleepEfficiency: 0,
      deepSleepPercentage: 0,
      remSleepPercentage: 0,
      numberOfAwakenings: 0,
      sleepScore: 0,
      timeToDeepSleep: 0,
      timeToREM: 0
    });
    
    const count = sessions.length;
    
    return {
      totalSleepTime: Math.round(totals.totalSleepTime / count),
      sleepEfficiency: Math.round((totals.sleepEfficiency / count) * 10) / 10,
      deepSleepPercentage: Math.round((totals.deepSleepPercentage / count) * 10) / 10,
      remSleepPercentage: Math.round((totals.remSleepPercentage / count) * 10) / 10,
      numberOfAwakenings: Math.round(totals.numberOfAwakenings / count),
      sleepScore: Math.round(totals.sleepScore / count),
      timeToDeepSleep: Math.round(totals.timeToDeepSleep / count),
      timeToREM: Math.round(totals.timeToREM / count)
    };
  }
  
  /**
   * Get sessions within the last N days
   */
  private static getSessionsInRange(sessions: SleepSession[], days: number): SleepSession[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return sessions.filter(session => 
      new Date(session.date) >= cutoffDate
    );
  }
  
  /**
   * Calculate trends using linear regression on key metrics
   */
  private static calculateTrends(sessions: SleepSession[]): {
    sleepEfficiencyTrend: number;
    deepSleepTrend: number;
    totalSleepTimeTrend: number;
  } {
    if (sessions.length < 2) {
      return {
        sleepEfficiencyTrend: 0,
        deepSleepTrend: 0,
        totalSleepTimeTrend: 0
      };
    }
    
    // Use last 14 days for trend calculation
    const recentSessions = this.getSessionsInRange(sessions, 14);
    
    if (recentSessions.length < 2) {
      return {
        sleepEfficiencyTrend: 0,
        deepSleepTrend: 0,
        totalSleepTimeTrend: 0
      };
    }
    
    const sleepEfficiencyTrend = this.calculateLinearTrend(
      recentSessions.map((s, i) => ({ x: i, y: s.metrics.sleepEfficiency }))
    );
    
    const deepSleepTrend = this.calculateLinearTrend(
      recentSessions.map((s, i) => ({ x: i, y: s.metrics.deepSleepPercentage }))
    );
    
    const totalSleepTimeTrend = this.calculateLinearTrend(
      recentSessions.map((s, i) => ({ x: i, y: s.metrics.totalSleepTime }))
    );
    
    return {
      sleepEfficiencyTrend: Math.round(sleepEfficiencyTrend * 100) / 100,
      deepSleepTrend: Math.round(deepSleepTrend * 100) / 100,
      totalSleepTimeTrend: Math.round(totalSleepTimeTrend * 100) / 100
    };
  }
  
  /**
   * Calculate linear trend (slope) from data points
   */
  private static calculateLinearTrend(points: { x: number; y: number }[]): number {
    const n = points.length;
    if (n < 2) return 0;
    
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return isNaN(slope) ? 0 : slope;
  }
  
  /**
   * Generate personalized sleep recommendations
   */
  private static generateRecommendations(sessions: SleepSession[]): string[] {
    if (sessions.length === 0) return [];
    
    const recommendations: string[] = [];
    const recent = this.getSessionsInRange(sessions, 7);
    const averageMetrics = this.calculateAverageMetrics(recent);
    
    // Sleep efficiency recommendations
    if (averageMetrics.sleepEfficiency && averageMetrics.sleepEfficiency < 85) {
      recommendations.push('Sua eficiência do sono está abaixo do ideal. Considere manter horários regulares de dormir e acordar.');
    }
    
    // Deep sleep recommendations
    if (averageMetrics.deepSleepPercentage && averageMetrics.deepSleepPercentage < 15) {
      recommendations.push('Você tem pouco sono profundo. Evite cafeína 6 horas antes de dormir e mantenha o quarto fresco.');
    }
    
    // REM sleep recommendations
    if (averageMetrics.remSleepPercentage && averageMetrics.remSleepPercentage < 15) {
      recommendations.push('Sono REM abaixo do ideal pode indicar stress. Considere técnicas de relaxamento antes de dormir.');
    }
    
    // Total sleep time recommendations
    if (averageMetrics.totalSleepTime && averageMetrics.totalSleepTime < 420) { // Less than 7 hours
      recommendations.push('Você está dormindo menos de 7 horas. Tente ir para cama 30 minutos mais cedo.');
    }
    
    // Awakenings recommendations
    if (averageMetrics.numberOfAwakenings && averageMetrics.numberOfAwakenings > 5) {
      recommendations.push('Muitos despertares noturnos. Verifique temperatura do quarto e evite líquidos 2 horas antes de dormir.');
    }
    
    // Sleep onset recommendations
    if (averageMetrics.timeToDeepSleep && averageMetrics.timeToDeepSleep > 45) {
      recommendations.push('Demora para entrar em sono profundo. Considere técnicas de relaxamento ou exercícios leves durante o dia.');
    }
    
    return recommendations;
  }
  
  /**
   * Empty analytics structure for when no data is available
   */
  private static getEmptyAnalytics(): SleepAnalytics {
    return {
      weeklyAverage: {},
      monthlyAverage: {},
      trends: {
        sleepEfficiencyTrend: 0,
        deepSleepTrend: 0,
        totalSleepTimeTrend: 0
      },
      recommendations: []
    };
  }
  
  /**
   * Calculate sleep debt over a period
   */
  static calculateSleepDebt(sessions: SleepSession[], targetHours = 8): number {
    const targetMinutes = targetHours * 60;
    
    return sessions.reduce((debt, session) => {
      const deficit = targetMinutes - session.metrics.totalSleepTime;
      return debt + Math.max(0, deficit); // Only accumulate deficits, not surplus
    }, 0);
  }
  
  /**
   * Find optimal bedtime based on historical data
   */
  static suggestOptimalBedtime(sessions: SleepSession[]): { 
    bedtime: string; 
    confidence: number; 
    reasoning: string 
  } {
    if (sessions.length < 3) {
      return {
        bedtime: '22:30',
        confidence: 0.1,
        reasoning: 'Dados insuficientes para análise personalizada'
      };
    }
    
    // Find sessions with best sleep scores
    const topSessions = sessions
      .filter(s => s.metrics.sleepScore >= 80)
      .sort((a, b) => b.metrics.sleepScore - a.metrics.sleepScore)
      .slice(0, Math.min(5, sessions.length));
    
    if (topSessions.length === 0) {
      return {
        bedtime: '22:00',
        confidence: 0.3,
        reasoning: 'Baseado em recomendações gerais (sem scores altos suficientes)'
      };
    }
    
    // Calculate average bedtime from top sessions
    const avgBedtimeMs = topSessions.reduce((sum, session) => 
      sum + session.startTime, 0) / topSessions.length;
    
    const avgBedtime = new Date(avgBedtimeMs);
    const bedtimeStr = `${String(avgBedtime.getHours()).padStart(2, '0')}:${String(avgBedtime.getMinutes()).padStart(2, '0')}`;
    
    return {
      bedtime: bedtimeStr,
      confidence: Math.min(0.9, topSessions.length / 10),
      reasoning: `Baseado em ${topSessions.length} noites com melhor qualidade de sono`
    };
  }
}