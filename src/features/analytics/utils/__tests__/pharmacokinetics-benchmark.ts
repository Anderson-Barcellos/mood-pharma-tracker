import type { Medication, MedicationDose } from '@/shared/types';
import { calculateConcentration, generateConcentrationCurve } from '../pharmacokinetics';
import { pkCache } from '../pharmacokinetics-cache';
import { perfMonitor } from '../performance-monitor';

const mockMedication: Medication = {
  id: 'test-med-1',
  name: 'Test Medication',
  category: 'antidepressant',
  halfLife: 12,
  volumeOfDistribution: 5,
  bioavailability: 0.8,
  absorptionRate: 1.5,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

function generateMockDoses(count: number, medicationId: string): MedicationDose[] {
  const now = Date.now();
  const doses: MedicationDose[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = now - (i * 12 * 3600 * 1000);
    doses.push({
      id: `dose-${i}`,
      medicationId,
      timestamp,
      doseAmount: 50 + Math.random() * 50,
      route: 'oral',
      createdAt: timestamp
    });
  }

  return doses.sort((a, b) => a.timestamp - b.timestamp);
}

interface BenchmarkResult {
  operation: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 100
): BenchmarkResult {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);

  const totalTime = times.reduce((sum, t) => sum + t, 0);
  const p50Index = Math.floor(iterations * 0.5);
  const p95Index = Math.floor(iterations * 0.95);
  const p99Index = Math.floor(iterations * 0.99);

  return {
    operation: name,
    iterations,
    totalTime,
    avgTime: totalTime / iterations,
    minTime: times[0],
    maxTime: times[iterations - 1],
    p50: times[p50Index],
    p95: times[p95Index],
    p99: times[p99Index]
  };
}

function formatResult(result: BenchmarkResult): string {
  return [
    `\n=== ${result.operation} ===`,
    `Iterations: ${result.iterations}`,
    `Total Time: ${result.totalTime.toFixed(2)}ms`,
    `Average: ${result.avgTime.toFixed(2)}ms`,
    `Min: ${result.minTime.toFixed(2)}ms`,
    `Max: ${result.maxTime.toFixed(2)}ms`,
    `P50: ${result.p50.toFixed(2)}ms`,
    `P95: ${result.p95.toFixed(2)}ms`,
    `P99: ${result.p99.toFixed(2)}ms`
  ].join('\n');
}

export function runPharmacokineticsBenchmarks() {
  console.log('Starting Pharmacokinetics Performance Benchmarks...\n');

  perfMonitor.clearMetrics();
  pkCache.invalidate();

  const smallDoseSet = generateMockDoses(10, mockMedication.id);
  const mediumDoseSet = generateMockDoses(50, mockMedication.id);
  const largeDoseSet = generateMockDoses(200, mockMedication.id);

  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 3600 * 1000);

  console.log('=== Test 1: Single Concentration Calculation ===\n');

  const result1 = benchmark(
    'calculateConcentration (10 doses)',
    () => calculateConcentration(mockMedication, smallDoseSet, now, 70),
    100
  );
  console.log(formatResult(result1));

  const result2 = benchmark(
    'calculateConcentration (50 doses)',
    () => calculateConcentration(mockMedication, mediumDoseSet, now, 70),
    100
  );
  console.log(formatResult(result2));

  const result3 = benchmark(
    'calculateConcentration (200 doses)',
    () => calculateConcentration(mockMedication, largeDoseSet, now, 70),
    100
  );
  console.log(formatResult(result3));

  console.log('\n=== Test 2: Concentration Curve Generation ===\n');

  pkCache.invalidate();

  const result4 = benchmark(
    'generateConcentrationCurve - 7 days, 168 points (no cache)',
    () => {
      pkCache.invalidate();
      generateConcentrationCurve(mockMedication, mediumDoseSet, sevenDaysAgo, now, 168, 70);
    },
    10
  );
  console.log(formatResult(result4));

  const result5 = benchmark(
    'generateConcentrationCurve - 7 days, 168 points (with cache)',
    () => {
      generateConcentrationCurve(mockMedication, mediumDoseSet, sevenDaysAgo, now, 168, 70);
    },
    100
  );
  console.log(formatResult(result5));

  console.log('\n=== Test 3: Cache Performance ===\n');

  pkCache.invalidate();

  const cachedResult1 = benchmark(
    'pkCache.getCurve - COLD (first call)',
    () => {
      pkCache.invalidate();
      pkCache.getCurve(mockMedication, mediumDoseSet, sevenDaysAgo, now, 168, 70);
    },
    10
  );
  console.log(formatResult(cachedResult1));

  const cachedResult2 = benchmark(
    'pkCache.getCurve - HOT (cached)',
    () => {
      pkCache.getCurve(mockMedication, mediumDoseSet, sevenDaysAgo, now, 168, 70);
    },
    100
  );
  console.log(formatResult(cachedResult2));

  const speedup = cachedResult1.avgTime / cachedResult2.avgTime;
  console.log(`\nCache Speedup: ${speedup.toFixed(1)}x faster`);

  console.log('\n=== Test 4: Performance Monitor Stats ===\n');
  perfMonitor.logReport();

  console.log('\n=== Test 5: Cache Statistics ===\n');
  const cacheStats = pkCache.getStats();
  console.log(JSON.stringify(cacheStats, null, 2));

  console.log('\n=== Summary ===\n');

  const results = [
    { name: '10 doses', time: result1.avgTime },
    { name: '50 doses', time: result2.avgTime },
    { name: '200 doses', time: result3.avgTime },
    { name: 'Curve (no cache)', time: result4.avgTime },
    { name: 'Curve (cached)', time: result5.avgTime },
    { name: 'pkCache COLD', time: cachedResult1.avgTime },
    { name: 'pkCache HOT', time: cachedResult2.avgTime }
  ];

  console.log('Operation                    | Avg Time');
  console.log('---------------------------- | ---------');
  results.forEach(r => {
    const padding = ' '.repeat(28 - r.name.length);
    console.log(`${r.name}${padding} | ${r.time.toFixed(2)}ms`);
  });

  console.log('\nBenchmarks Complete!');
  console.log('\nExpected Performance Targets:');
  console.log('- Single calculation: <5ms');
  console.log('- Curve generation (no cache): <500ms');
  console.log('- Curve generation (cached): <50ms');
  console.log('- Cache speedup: >10x');

  return results;
}

export function compareWithoutOptimizations() {
  console.log('\n=== Comparison: Optimized vs Unoptimized ===\n');

  const doses = generateMockDoses(50, mockMedication.id);
  const now = Date.now();
  const sevenDaysAgo = now - (7 * 24 * 3600 * 1000);

  perfMonitor.setEnabled(false);
  pkCache.invalidate();

  const unoptimizedResult = benchmark(
    'Unoptimized (no cache, no monitoring)',
    () => {
      for (let i = 0; i < 168; i++) {
        const time = sevenDaysAgo + (i * (7 * 24 * 3600 * 1000) / 168);
        calculateConcentration(mockMedication, doses, time, 70);
      }
    },
    10
  );

  console.log(formatResult(unoptimizedResult));

  perfMonitor.setEnabled(true);

  const optimizedResult = benchmark(
    'Optimized (with cache)',
    () => {
      pkCache.getCurve(mockMedication, doses, sevenDaysAgo, now, 168, 70);
    },
    100
  );

  console.log(formatResult(optimizedResult));

  const improvement = unoptimizedResult.avgTime / optimizedResult.avgTime;
  console.log(`\nOptimization Improvement: ${improvement.toFixed(1)}x faster`);

  return { unoptimizedResult, optimizedResult, improvement };
}

if (typeof window !== 'undefined') {
  (window as any).__runPharmacokineticsBenchmarks = runPharmacokineticsBenchmarks;
  (window as any).__compareOptimizations = compareWithoutOptimizations;
}
