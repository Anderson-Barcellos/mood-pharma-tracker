import type { MoodEntry, MedicationDose } from '@/shared/types';
import type { HeartRateRecord } from '@/features/health-data/services/heart-rate-processor';

export interface CorrelationResult {
  value: number;
  pValue: number;
  confidence: number;
  significance: 'high' | 'medium' | 'low' | 'none';
  sampleSize: number;
  method: 'pearson' | 'spearman' | 'kendall';
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  standardError: number;
  predictions: number[];
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface MultiVariableCorrelation {
  variables: string[];
  correlationMatrix: number[][];
  pValueMatrix: number[][];
  significantPairs: Array<{
    var1: string;
    var2: string;
    correlation: number;
    pValue: number;
  }>;
}

export class StatisticsEngine {
  /**
   * Calcula correlação de Pearson entre duas séries
   */
  static pearsonCorrelation(x: number[], y: number[]): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
      return {
        value: 0,
        pValue: 1,
        confidence: 0,
        significance: 'none',
        sampleSize: x.length,
        method: 'pearson'
      };
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) {
      return {
        value: 0,
        pValue: 1,
        confidence: 0,
        significance: 'none',
        sampleSize: n,
        method: 'pearson'
      };
    }

    const rRaw = numerator / denominator;
    // Clamp to avoid numerical issues near |r|=1
    const r = Math.max(-0.9999999999, Math.min(0.9999999999, rRaw));

    // Calcula p-value usando distribuição t de Student
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const pValue = this.calculatePValue(t, n - 2);

    // Determina significância
    let significance: CorrelationResult['significance'] = 'none';
    if (pValue < 0.001) significance = 'high';
    else if (pValue < 0.01) significance = 'medium';
    else if (pValue < 0.05) significance = 'low';

    // Calcula intervalo de confiança 95%
    const confidence = 1.96 / Math.sqrt(n - 3);

    return {
      value: r,
      pValue,
      confidence,
      significance,
      sampleSize: n,
      method: 'pearson'
    };
  }

  /**
   * Calcula correlação de Spearman (rank-based)
   */
  static spearmanCorrelation(x: number[], y: number[]): CorrelationResult {
    if (x.length !== y.length || x.length < 3) {
      return {
        value: 0,
        pValue: 1,
        confidence: 0,
        significance: 'none',
        sampleSize: x.length,
        method: 'spearman'
      };
    }

    // Converte valores para ranks
    const xRanks = this.rankData(x);
    const yRanks = this.rankData(y);

    // Usa Pearson nos ranks
    const result = this.pearsonCorrelation(xRanks, yRanks);
    result.method = 'spearman';

    return result;
  }

  /**
   * Converte dados para ranks (usado em Spearman)
   */
  private static rankData(data: number[]): number[] {
    const indexed = data.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);

    const ranks = new Array(data.length);
    let currentRank = 1;

    for (let i = 0; i < indexed.length; i++) {
      let j = i;
      let sum = 0;
      let count = 0;

      // Handle ties
      while (j < indexed.length && indexed[j].value === indexed[i].value) {
        sum += currentRank + count;
        count++;
        j++;
      }

      const avgRank = sum / count;
      for (let k = i; k < j; k++) {
        ranks[indexed[k].index] = avgRank;
      }

      currentRank += count;
      i = j - 1;
    }

    return ranks;
  }

  /**
   * Calcula p-value usando distribuição t
   */
  private static calculatePValue(t: number, df: number): number {
    if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return 1;
    // Two-tailed p-value for Student's t using regularized incomplete beta.
    // p = I_{df/(df+t^2)}(df/2, 1/2)
    const x = df / (df + t * t);
    const a = df / 2;
    const b = 0.5;
    const p = this.regularizedIncompleteBeta(x, a, b);
    return Math.min(1, Math.max(0, p));
  }

  /**
   * Regularized incomplete beta I_x(a,b)
   * Implementation based on Numerical Recipes (continued fraction).
   */
  private static regularizedIncompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    const lnBeta = this.logBeta(a, b);
    const bt = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnBeta);

    // Use symmetry transformation for better convergence
    const threshold = (a + 1) / (a + b + 2);
    if (x < threshold) {
      return (bt * this.betaContinuedFraction(a, b, x)) / a;
    }
    return 1 - (bt * this.betaContinuedFraction(b, a, 1 - x)) / b;
  }

  private static betaContinuedFraction(a: number, b: number, x: number): number {
    const MAXIT = 200;
    const EPS = 3e-10;
    const FPMIN = 1e-30;

    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;

    let c = 1;
    let d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;

    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;

      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;

      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;

      if (Math.abs(del - 1) < EPS) break;
    }

    return h;
  }

  private static logBeta(a: number, b: number): number {
    return this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
  }

  private static logGamma(z: number): number {
    // Lanczos approximation for log-gamma, stable for large values.
    const p = [
      676.5203681218851,
      -1259.1392167224028,
      771.3234287776531,
      -176.6150291621406,
      12.507343278686905,
      -0.13857109526572012,
      9.984369578019572e-6,
      1.5056327351493116e-7,
    ];

    if (z < 0.5) {
      return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - this.logGamma(1 - z);
    }

    let x = 0.9999999999998099;
    let t = z - 1;
    for (let i = 0; i < p.length; i++) {
      x += p[i] / (t + i + 1);
    }
    const g = p.length - 0.5;
    const tmp = t + g;
    return 0.5 * Math.log(2 * Math.PI) + (t + 0.5) * Math.log(tmp) - tmp + Math.log(x);
  }

  /**
   * Regressão linear simples
   */
  static linearRegression(x: number[], y: number[]): RegressionResult {
    const n = x.length;
    if (n < 2 || n !== y.length) {
      return {
        slope: 0,
        intercept: 0,
        rSquared: 0,
        standardError: 0,
        predictions: []
      };
    }

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calcula R²
    const predictions = x.map(xi => slope * xi + intercept);
    const meanY = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // Erro padrão
    const standardError = Math.sqrt(ssResidual / (n - 2));

    return {
      slope,
      intercept,
      rSquared,
      standardError,
      predictions
    };
  }

  /**
   * Autocorrelação temporal
   */
  static autocorrelation(data: number[], maxLag: number = 24): number[] {
    const result: number[] = [];
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;

    for (let lag = 0; lag <= Math.min(maxLag, n - 1); lag++) {
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < n - lag; i++) {
        numerator += (data[i] - mean) * (data[i + lag] - mean);
      }

      for (let i = 0; i < n; i++) {
        denominator += Math.pow(data[i] - mean, 2);
      }

      result.push(denominator > 0 ? numerator / denominator : 0);
    }

    return result;
  }

  /**
   * Correlação cruzada com lag
   */
  static crossCorrelation(
    x: number[],
    y: number[],
    maxLag: number = 24,
    minPairs: number = 5,
    options?: {
      method?: 'pearson' | 'spearman';
      transform?: 'levels' | 'differences';
    }
  ): Array<{ lag: number; correlation: number; n: number; pValue: number; significance: CorrelationResult['significance'] }> {
    const len = Math.min(x.length, y.length);
    const method = options?.method ?? 'pearson';
    const transform = options?.transform ?? 'levels';

    const transformSeries = (data: number[]): number[] => {
      if (transform === 'differences') {
        const diff = new Array(data.length);
        diff[0] = NaN;
        for (let i = 1; i < data.length; i++) {
          const prev = data[i - 1];
          const curr = data[i];
          diff[i] = Number.isFinite(prev) && Number.isFinite(curr) ? curr - prev : NaN;
        }
        return diff;
      }
      return data;
    };

    const tx = transformSeries(x);
    const ty = transformSeries(y);
    const result: Array<{ lag: number; correlation: number; n: number; pValue: number; significance: CorrelationResult['significance'] }> = [];

    for (let lag = -maxLag; lag <= maxLag; lag++) {
      const xs: number[] = [];
      const ys: number[] = [];

      if (lag >= 0) {
        for (let i = 0; i + lag < len; i++) {
          const xi = tx[i];
          const yj = ty[i + lag];
          if (Number.isFinite(xi) && Number.isFinite(yj)) {
            xs.push(xi);
            ys.push(yj);
          }
        }
      } else {
        const shift = -lag;
        for (let i = shift; i < len; i++) {
          const xi = tx[i];
          const yj = ty[i - shift];
          if (Number.isFinite(xi) && Number.isFinite(yj)) {
            xs.push(xi);
            ys.push(yj);
          }
        }
      }

      if (xs.length >= minPairs) {
        const corr = method === 'spearman'
          ? this.spearmanCorrelation(xs, ys)
          : this.pearsonCorrelation(xs, ys);
        result.push({
          lag,
          correlation: corr.value,
          n: corr.sampleSize,
          pValue: corr.pValue,
          significance: corr.significance
        });
      } else {
        result.push({
          lag,
          correlation: 0,
          n: xs.length,
          pValue: 1,
          significance: 'none'
        });
      }
    }

    return result;
  }

  /**
   * Análise de correlação múltipla
   */
  static multiVariableCorrelation(
    data: Record<string, number[]>
  ): MultiVariableCorrelation {
    const variables = Object.keys(data);
    const n = variables.length;
    const correlationMatrix: number[][] = [];
    const pValueMatrix: number[][] = [];
    const significantPairs: MultiVariableCorrelation['significantPairs'] = [];

    for (let i = 0; i < n; i++) {
      correlationMatrix[i] = [];
      pValueMatrix[i] = [];

      for (let j = 0; j < n; j++) {
        if (i === j) {
          correlationMatrix[i][j] = 1;
          pValueMatrix[i][j] = 0;
        } else {
          const result = this.pearsonCorrelation(data[variables[i]], data[variables[j]]);
          correlationMatrix[i][j] = result.value;
          pValueMatrix[i][j] = result.pValue;

          if (i < j && result.pValue < 0.05) {
            significantPairs.push({
              var1: variables[i],
              var2: variables[j],
              correlation: result.value,
              pValue: result.pValue
            });
          }
        }
      }
    }

    // Ordena pares significativos por força da correlação
    significantPairs.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    return {
      variables,
      correlationMatrix,
      pValueMatrix,
      significantPairs
    };
  }

  /**
   * Sincroniza e alinha séries temporais
   */
  static alignTimeSeries(
    series1: TimeSeriesData[],
    series2: TimeSeriesData[],
    windowMs: number = 3600000 // 1 hora
  ): { aligned1: number[], aligned2: number[], timestamps: number[] } {
    const aligned1: number[] = [];
    const aligned2: number[] = [];
    const timestamps: number[] = [];

    // Cria mapa para busca eficiente
    const series2Map = new Map<number, number>();
    series2.forEach(point => {
      const roundedTime = Math.floor(point.timestamp / windowMs) * windowMs;
      if (!series2Map.has(roundedTime)) {
        series2Map.set(roundedTime, point.value);
      }
    });

    // Alinha séries
    series1.forEach(point1 => {
      const roundedTime = Math.floor(point1.timestamp / windowMs) * windowMs;
      const value2 = series2Map.get(roundedTime);

      if (value2 !== undefined) {
        aligned1.push(point1.value);
        aligned2.push(value2);
        timestamps.push(roundedTime);
      }
    });

    return { aligned1, aligned2, timestamps };
  }

  /**
   * Detecta outliers usando método IQR
   */
  static detectOutliers(data: number[]): { indices: number[], values: number[] } {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const indices: number[] = [];
    const values: number[] = [];

    data.forEach((value, index) => {
      if (value < lowerBound || value > upperBound) {
        indices.push(index);
        values.push(value);
      }
    });

    return { indices, values };
  }

  /**
   * Calcula estatísticas descritivas
   */
  static descriptiveStats(data: number[]): {
    mean: number;
    median: number;
    mode: number;
    stdDev: number;
    variance: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    skewness: number;
    kurtosis: number;
  } {
    const n = data.length;
    if (n === 0) {
      return {
        mean: 0, median: 0, mode: 0, stdDev: 0, variance: 0,
        min: 0, max: 0, q1: 0, q3: 0, skewness: 0, kurtosis: 0
      };
    }

    const sorted = [...data].sort((a, b) => a - b);

    // Média
    const mean = data.reduce((a, b) => a + b, 0) / n;

    // Mediana
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Moda (valor mais frequente)
    const frequency: Record<number, number> = {};
    data.forEach(v => frequency[v] = (frequency[v] || 0) + 1);
    const mode = Number(Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 0);

    // Variância e desvio padrão
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Min e Max
    const min = sorted[0];
    const max = sorted[n - 1];

    // Quartis
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];

    // Skewness (assimetria)
    const skewness = n > 2 && stdDev > 0
      ? data.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0) / n
      : 0;

    // Kurtosis (curtose)
    const kurtosis = n > 3 && stdDev > 0
      ? data.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 4), 0) / n - 3
      : 0;

    return {
      mean, median, mode, stdDev, variance,
      min, max, q1, q3, skewness, kurtosis
    };
  }

  /**
   * Análise de correlação entre humor, medicamentos e FC
   */
  static analyzeHealthCorrelations(
    moodData: MoodEntry[],
    heartRateData: HeartRateRecord[],
    medicationConcentrations: Array<{ timestamp: number; concentration: number; medicationName: string }>
  ): {
    moodVsHeartRate: CorrelationResult;
    moodVsConcentration: Record<string, CorrelationResult>;
    heartRateVsConcentration: Record<string, CorrelationResult>;
    insights: string[];
  } {
    const insights: string[] = [];

    // Alinha dados temporalmente (janela de 1 hora)
    const windowMs = 3600000;
    const alignedData = new Map<number, any>();

    // Adiciona dados de humor
    moodData.forEach(entry => {
      const key = Math.floor(entry.timestamp / windowMs) * windowMs;
      if (!alignedData.has(key)) {
        alignedData.set(key, {});
      }
      alignedData.get(key)!.mood = entry.moodScore;
      alignedData.get(key)!.anxiety = entry.anxietyLevel;
      alignedData.get(key)!.energy = entry.energyLevel;
    });

    // Adiciona dados de FC
    heartRateData.forEach(record => {
      const key = Math.floor(record.timestamp / windowMs) * windowMs;
      if (!alignedData.has(key)) {
        alignedData.set(key, {});
      }
      const existing = alignedData.get(key)!;
      existing.heartRate = existing.heartRate
        ? (existing.heartRate + record.heartRate) / 2
        : record.heartRate;
    });

    // Adiciona concentrações de medicamentos
    const medicationsByName = new Map<string, number[]>();
    medicationConcentrations.forEach(item => {
      const key = Math.floor(item.timestamp / windowMs) * windowMs;
      if (!alignedData.has(key)) {
        alignedData.set(key, {});
      }
      const existing = alignedData.get(key)!;
      existing[`conc_${item.medicationName}`] = item.concentration;

      if (!medicationsByName.has(item.medicationName)) {
        medicationsByName.set(item.medicationName, []);
      }
    });

    // Extrai séries alinhadas
    const alignedPoints = Array.from(alignedData.entries())
      .filter(([_, data]) => data.mood && data.heartRate)
      .sort((a, b) => a[0] - b[0]);

    const moodValues = alignedPoints.map(([_, data]) => data.mood);
    const hrValues = alignedPoints.map(([_, data]) => data.heartRate);

    // Correlação Humor vs FC
    const moodVsHeartRate = this.pearsonCorrelation(moodValues, hrValues);
    if (moodVsHeartRate.significance !== 'none') {
      insights.push(
        `Humor ${moodVsHeartRate.value > 0 ? 'aumenta' : 'diminui'} com FC ` +
        `(r=${moodVsHeartRate.value.toFixed(2)}, p=${moodVsHeartRate.pValue.toFixed(3)})`
      );
    }

    // Correlações com medicamentos
    const moodVsConcentration: Record<string, CorrelationResult> = {};
    const heartRateVsConcentration: Record<string, CorrelationResult> = {};

    medicationsByName.forEach((_, medName) => {
      const concValues = alignedPoints
        .map(([_, data]) => data[`conc_${medName}`])
        .filter(v => v !== undefined);

      if (concValues.length >= 10) {
        const alignedMood = alignedPoints
          .filter(([_, data]) => data[`conc_${medName}`] !== undefined)
          .map(([_, data]) => data.mood);

        const alignedHR = alignedPoints
          .filter(([_, data]) => data[`conc_${medName}`] !== undefined)
          .map(([_, data]) => data.heartRate);

        moodVsConcentration[medName] = this.pearsonCorrelation(concValues, alignedMood);
        heartRateVsConcentration[medName] = this.pearsonCorrelation(concValues, alignedHR);

        if (moodVsConcentration[medName].significance !== 'none') {
          insights.push(
            `${medName}: ${moodVsConcentration[medName].value > 0 ? 'melhora' : 'piora'} humor ` +
            `(r=${moodVsConcentration[medName].value.toFixed(2)})`
          );
        }

        if (heartRateVsConcentration[medName].significance !== 'none') {
          insights.push(
            `${medName}: ${heartRateVsConcentration[medName].value > 0 ? 'aumenta' : 'reduz'} FC ` +
            `(r=${heartRateVsConcentration[medName].value.toFixed(2)})`
          );
        }
      }
    });

    return {
      moodVsHeartRate,
      moodVsConcentration,
      heartRateVsConcentration,
      insights
    };
  }
}
