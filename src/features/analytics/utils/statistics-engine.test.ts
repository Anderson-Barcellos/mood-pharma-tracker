import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StatisticsEngine } from './statistics-engine';

describe('StatisticsEngine.crossCorrelation', () => {
  it('computes correlations for positive and negative lags', () => {
    const x = [1, 2, 3, 4, 5, 6];
    const y = [2, 3, 4, 5, 6, 7];
    const result = StatisticsEngine.crossCorrelation(x, y, 2, 3);
    const zero = result.find(p => p.lag === 0)!;
    const pos1 = result.find(p => p.lag === 1)!;
    const neg1 = result.find(p => p.lag === -1)!;
    assert.ok(Math.abs(zero.correlation - 1) < 1e-6);
    assert.ok(Math.abs(pos1.correlation - 1) < 1e-6);
    assert.ok(Math.abs(neg1.correlation - 1) < 1e-6);
    assert.strictEqual(zero.n, 6);
    assert.strictEqual(pos1.n, 5);
    assert.strictEqual(neg1.n, 5);
  });

  it('skips NaN pairs and enforces minPairs threshold', () => {
    const x = [1, 2, NaN, 4, 5, 6];
    const y = [NaN, 2, 3, 4, NaN, 6];
    const result = StatisticsEngine.crossCorrelation(x, y, 1, 3);
    const zero = result.find(p => p.lag === 0)!;
    const pos1 = result.find(p => p.lag === 1)!;
    assert.strictEqual(zero.n, 3);
    assert.ok(Math.abs(zero.correlation - 1) < 1e-6);
    assert.strictEqual(pos1.n, 3);
    assert.ok(Math.abs(pos1.correlation - 1) < 1e-6);
  });

  it('zeros correlation when below minPairs', () => {
    const x = [1, NaN, 2];
    const y = [1, 2, NaN];
    const result = StatisticsEngine.crossCorrelation(x, y, 1, 3);
    const zero = result.find(p => p.lag === 0)!;
    assert.strictEqual(zero.n, 1);
    assert.strictEqual(zero.correlation, 0);
    assert.strictEqual(zero.pValue, 1);
    assert.strictEqual(zero.significance, 'none');
  });

  it('supports differences transform and spearman method', () => {
    const x = [1, 2, 4, 7, 11];
    const y = [10, 11, 13, 16, 20];
    const result = StatisticsEngine.crossCorrelation(x, y, 0, 3, {
      method: 'spearman',
      transform: 'differences'
    });
    const zero = result.find(p => p.lag === 0)!;
    assert.ok(Math.abs(zero.correlation - 1) < 1e-6);
    assert.strictEqual(zero.n, 4);
  });
});
