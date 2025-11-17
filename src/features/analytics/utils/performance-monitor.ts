interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers = new Map<string, number>();
  private readonly maxMetrics = 1000;
  private enabled = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  start(operation: string): void {
    if (!this.enabled) return;
    this.timers.set(operation, performance.now());
  }

  end(operation: string, metadata?: Record<string, unknown>): number | null {
    if (!this.enabled) return null;

    const startTime = this.timers.get(operation);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] No start time found for operation: ${operation}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    this.timers.delete(operation);

    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
      metadata
    });

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    if (duration > 100) {
      console.warn(
        `[PerformanceMonitor] Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`,
        metadata
      );
    }

    return duration;
  }

  measure<T>(operation: string, fn: () => T, metadata?: Record<string, unknown>): T {
    if (!this.enabled) return fn();

    this.start(operation);
    try {
      const result = fn();
      this.end(operation, metadata);
      return result;
    } catch (error) {
      this.timers.delete(operation);
      throw error;
    }
  }

  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    if (!this.enabled) return fn();

    this.start(operation);
    try {
      const result = await fn();
      this.end(operation, metadata);
      return result;
    } catch (error) {
      this.timers.delete(operation);
      throw error;
    }
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (!operation) return [...this.metrics];
    return this.metrics.filter(m => m.operation === operation);
  }

  getStats(operation?: string): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = operation ? this.getMetrics(operation) : this.metrics;

    if (metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, val) => acc + val, 0);

    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      count: metrics.length,
      avg: sum / metrics.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: durations[p50Index],
      p95: durations[p95Index],
      p99: durations[p99Index]
    };
  }

  clearMetrics(operation?: string): void {
    if (!operation) {
      this.metrics = [];
      return;
    }

    this.metrics = this.metrics.filter(m => m.operation !== operation);
  }

  getReport(): string {
    const operations = new Set(this.metrics.map(m => m.operation));
    const report: string[] = ['=== Performance Report ===\n'];

    for (const operation of operations) {
      const stats = this.getStats(operation);
      if (!stats) continue;

      report.push(`\nOperation: ${operation}`);
      report.push(`  Count: ${stats.count}`);
      report.push(`  Average: ${stats.avg.toFixed(2)}ms`);
      report.push(`  Min: ${stats.min.toFixed(2)}ms`);
      report.push(`  Max: ${stats.max.toFixed(2)}ms`);
      report.push(`  P50: ${stats.p50.toFixed(2)}ms`);
      report.push(`  P95: ${stats.p95.toFixed(2)}ms`);
      report.push(`  P99: ${stats.p99.toFixed(2)}ms`);
    }

    return report.join('\n');
  }

  logReport(): void {
    console.log(this.getReport());
  }
}

export const perfMonitor = new PerformanceMonitor();

if (typeof window !== 'undefined') {
  (window as any).__perfMonitor = perfMonitor;
}
