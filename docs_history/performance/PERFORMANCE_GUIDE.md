# Performance Monitoring & Optimization Guide

## Quick Start

### Viewing Performance Metrics

Open browser console and run:

```javascript
// View complete performance report
window.__perfMonitor.logReport()

// View cache statistics
window.__perfMonitor.getStats('calculateConcentration')

// View cache info
window.pkCache = require('@/features/analytics/utils/pharmacokinetics-cache').pkCache
window.pkCache.getStats()
```

### Running Benchmarks

```javascript
// Run full benchmark suite
window.__runPharmacokineticsBenchmarks()

// Compare optimized vs unoptimized
window.__compareOptimizations()
```

## Performance Targets

### Expected Performance (After Optimization)

| Operation | Target | Acceptable | Poor |
|-----------|--------|------------|------|
| Single concentration calc | <5ms | 5-20ms | >20ms |
| Curve generation (cold) | <300ms | 300-500ms | >500ms |
| Curve generation (hot) | <50ms | 50-100ms | >100ms |
| Database query (indexed) | <10ms | 10-30ms | >30ms |
| Chart render (cached) | <100ms | 100-200ms | >200ms |

### Cache Hit Rate

- **Excellent**: >90%
- **Good**: 70-90%
- **Poor**: <70%

If cache hit rate is poor:
1. Check if cache TTL is too short (default 5 min)
2. Verify cache isn't being invalidated too aggressively
3. Check memory constraints

## Troubleshooting

### Slow Chart Rendering

**Symptom**: Chart takes >500ms to render

**Diagnosis**:
```javascript
window.__perfMonitor.getStats('generateConcentrationCurve')
```

**Solutions**:
1. **High P95 times**: Cache not being used effectively
   - Check cache invalidation logic
   - Verify React Query is properly configured

2. **Consistently slow**: Large dataset
   - Check dose count: `db.doses.count()`
   - Consider reducing time range or points

3. **Slow first render only**: Normal - cache is cold
   - Subsequent renders should be fast
   - Consider preloading data

### Database Query Performance

**Symptom**: Queries taking >50ms

**Diagnosis**:
```javascript
// Open IndexedDB in DevTools → Application
// Check if compound index exists: [medicationId+timestamp]
```

**Solutions**:
1. **Missing index**: Database migration failed
   - Check browser console for errors
   - Manually increment DB version

2. **Large dataset**: Too many doses
   - Consider archiving old data
   - Implement pagination

### Memory Issues

**Symptom**: High memory usage or crashes

**Diagnosis**:
```javascript
window.pkCache.getStats()
// Check: totalCacheSize should be <500
```

**Solutions**:
1. **Cache too large**: Reduce MAX_CACHE_SIZE
   - Edit `pharmacokinetics-cache.ts`
   - Default is 500 entries

2. **Cache not evicting**: LRU not working
   - Check access order length matches cache size
   - Verify clearExpiredEntries is running

## Monitoring in Production

### Setup Performance Alerts

```typescript
import { perfMonitor } from '@/features/analytics/utils/performance-monitor';

// Log slow operations
const originalEnd = perfMonitor.end.bind(perfMonitor);
perfMonitor.end = (operation, metadata) => {
  const duration = originalEnd(operation, metadata);

  if (duration && duration > 200) {
    // Send to analytics service
    analytics.track('slow_operation', {
      operation,
      duration,
      metadata
    });
  }

  return duration;
};
```

### Track Cache Effectiveness

```typescript
import { pkCache } from '@/features/analytics/utils/pharmacokinetics-cache';

setInterval(() => {
  const stats = pkCache.getStats();

  analytics.track('cache_stats', {
    size: stats.totalCacheSize,
    timestamp: Date.now()
  });
}, 60000); // Every minute
```

## Optimization Checklist

Before optimizing, verify:

- [ ] Database has compound indexes (version 3)
- [ ] React Query provider is configured
- [ ] Cache invalidation happens on dose CRUD
- [ ] Performance monitoring is enabled
- [ ] Console has no errors

If performance is still poor:

- [ ] Run benchmarks to identify bottleneck
- [ ] Check cache hit rate
- [ ] Verify database indexes exist
- [ ] Check for excessive re-renders (React DevTools)
- [ ] Profile with Chrome DevTools Performance tab

## Advanced Optimization

### Reduce Cache Memory Usage

```typescript
// In pharmacokinetics-cache.ts
const CACHE_TTL = 2 * 60 * 1000; // Reduce from 5min to 2min
const MAX_CACHE_SIZE = 200; // Reduce from 500 to 200
```

### Increase Cache Hit Rate

```typescript
// In use-concentration-data.ts
staleTime: 10 * 60 * 1000, // Increase from 5min to 10min
gcTime: 20 * 60 * 1000, // Increase from 10min to 20min
```

### Disable Performance Monitoring

```typescript
import { perfMonitor } from '@/features/analytics/utils/performance-monitor';

perfMonitor.setEnabled(false); // Disable in production for slight perf gain
```

## Benchmarking Tips

### Before/After Comparison

```javascript
// 1. Clear all caches
window.__perfMonitor.clearMetrics()
window.pkCache.invalidate()

// 2. Run test scenario (e.g., open 7-day chart)
// 3. Note render time from DevTools

// 4. Run same scenario again
// 5. Note cached render time

// 6. Calculate improvement
const improvement = firstRender / cachedRender
console.log(`${improvement}x faster with cache`)
```

### Stress Testing

```javascript
// Generate large dataset
const doses = [];
for (let i = 0; i < 500; i++) {
  doses.push({
    id: `dose-${i}`,
    medicationId: 'test-med',
    timestamp: Date.now() - (i * 12 * 3600 * 1000),
    doseAmount: 50,
    route: 'oral',
    createdAt: Date.now()
  });
}

// Test performance
window.__perfMonitor.start('stress-test');
window.pkCache.getCurve(medication, doses, startTime, endTime, 168, 70);
window.__perfMonitor.end('stress-test');
```

## Common Performance Patterns

### Good Performance Profile
```
calculateConcentration: avg 2ms, p95 5ms
generateConcentrationCurve: avg 150ms (cold), 30ms (hot)
Cache hit rate: 92%
Database queries: avg 5ms
```

### Poor Performance Profile
```
calculateConcentration: avg 25ms, p95 80ms
generateConcentrationCurve: avg 800ms (cold), 600ms (hot)
Cache hit rate: 15%
Database queries: avg 120ms
```

If you see poor performance:
1. Check database indexes exist
2. Verify cache isn't being cleared too often
3. Check for memory pressure (cache eviction)
4. Profile with Chrome DevTools
5. Consider reducing dataset size

## Support

For performance issues:
1. Run `window.__perfMonitor.logReport()`
2. Run `window.pkCache.getStats()`
3. Check browser console for warnings
4. Export performance data for analysis

Performance monitoring provides detailed metrics to diagnose and resolve performance issues quickly.
