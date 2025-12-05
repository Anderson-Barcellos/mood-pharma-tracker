export interface TimeSeriesPoint {
  time: number;
  x?: number | null;
  y?: number | null;
}

export interface LaggedCorrelation {
  lagHours: number;
  r: number;
  n: number;
}

function pearson(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3 || n !== y.length) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let sumXSq = 0;
  let sumYSq = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    sumXSq += dx * dx;
    sumYSq += dy * dy;
  }

  const denom = Math.sqrt(sumXSq * sumYSq);
  if (!Number.isFinite(denom) || denom === 0) return 0;
  return num / denom;
}

/**
 * Compute Pearson correlation for a given lag (in hours) between x(t) e y(t+lag).
 * Assume série com intervalos uniformes (como o chartData da Analytics).
 */
export function computeLaggedCorrelation(
  series: TimeSeriesPoint[],
  lagHours: number
): LaggedCorrelation {
  if (series.length < 3) {
    return { lagHours, r: 0, n: 0 };
  }

  const first = series[0]?.time;
  const second = series[1]?.time;
  const intervalMs = second && first ? second - first : 0;
  if (!intervalMs || intervalMs <= 0) {
    return { lagHours, r: 0, n: 0 };
  }

  const lagMs = lagHours * 60 * 60 * 1000;
  const shift = Math.round(lagMs / intervalMs);

  const xs: number[] = [];
  const ys: number[] = [];

  const len = series.length;

  if (shift >= 0) {
    for (let i = 0; i + shift < len; i++) {
      const a = series[i];
      const b = series[i + shift];
      const x = a.x;
      const y = b.y;
      if (Number.isFinite(x as number) && Number.isFinite(y as number)) {
        xs.push(x as number);
        ys.push(y as number);
      }
    }
  } else {
    const s = -shift;
    for (let i = s; i < len; i++) {
      const a = series[i];
      const b = series[i - s];
      const x = a.x;
      const y = b.y;
      if (Number.isFinite(x as number) && Number.isFinite(y as number)) {
        xs.push(x as number);
        ys.push(y as number);
      }
    }
  }

  if (xs.length < 3) {
    return { lagHours, r: 0, n: xs.length };
  }

  const r = pearson(xs, ys);
  return { lagHours, r, n: xs.length };
}

export function describeStrength(r: number): 'fraca' | 'moderada' | 'forte' {
  const abs = Math.abs(r);
  if (abs > 0.7) return 'forte';
  if (abs > 0.4) return 'moderada';
  return 'fraca';
}

