import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { useHealthCorrelations } from '@/hooks/use-health-data';
import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';
import { useMemo } from 'react';

interface CorrelationInsightsProps {
  maxSignificance?: number;
  minCorrelation?: number;
  limit?: number;
}

export default function CorrelationInsights({
  maxSignificance = 0.05,
  minCorrelation = 0.3,
  limit = 5
}: CorrelationInsightsProps) {
  const correlations = useHealthCorrelations(maxSignificance, minCorrelation) ?? [];

  const topCorrelations = useMemo(() => {
    return correlations.slice(0, limit);
  }, [correlations, limit]);

  const getCorrelationStrength = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'Strong';
    if (abs >= 0.5) return 'Moderate';
    if (abs >= 0.3) return 'Weak';
    return 'Very Weak';
  };

  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'text-green-600 dark:text-green-400';
    if (abs >= 0.5) return 'text-blue-600 dark:text-blue-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getCorrelationIcon = (correlation: number) => {
    if (correlation > 0.1) {
      return <TrendUp className="h-5 w-5 text-green-500" weight="bold" />;
    } else if (correlation < -0.1) {
      return <TrendDown className="h-5 w-5 text-red-500" weight="bold" />;
    }
    return <Minus className="h-5 w-5 text-gray-500" weight="bold" />;
  };

  const formatVariableName = (variable: string): string => {
    // Convert variable names to readable format
    return variable
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (topCorrelations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Correlation Insights</CardTitle>
          <CardDescription>
            Significant correlations between health metrics and mood
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">No significant correlations found.</p>
            <p className="text-xs mt-2">
              Correlations require sufficient health and mood data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correlation Insights</CardTitle>
        <CardDescription>
          Top {limit} significant correlations between health metrics and mood
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topCorrelations.map((corr, index) => (
            <div
              key={corr.id}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
            >
              <div className="mt-0.5">{getCorrelationIcon(corr.correlation)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">
                    {formatVariableName(corr.variable1)} ↔ {formatVariableName(corr.variable2)}
                  </h4>
                  <span
                    className={`text-xs font-semibold ${getCorrelationColor(corr.correlation)}`}
                  >
                    r = {corr.correlation.toFixed(3)}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium">
                    {getCorrelationStrength(corr.correlation)} correlation
                  </span>
                  <span>•</span>
                  <span>
                    p-value: {corr.significance < 0.001 ? '<0.001' : corr.significance.toFixed(3)}
                  </span>
                </div>

                {corr.insight && (
                  <p className="text-xs mt-2 text-muted-foreground leading-relaxed">
                    {corr.insight}
                  </p>
                )}

                {/* Correlation direction explanation */}
                <div className="mt-2 text-xs">
                  {corr.correlation > 0 ? (
                    <span className="text-green-600 dark:text-green-400">
                      ↗ Positive: As {formatVariableName(corr.variable1)} increases,{' '}
                      {formatVariableName(corr.variable2)} tends to increase
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      ↘ Negative: As {formatVariableName(corr.variable1)} increases,{' '}
                      {formatVariableName(corr.variable2)} tends to decrease
                    </span>
                  )}
                </div>
              </div>

              {/* Visual correlation strength bar */}
              <div className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="text-xs font-medium text-muted-foreground">Strength</div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      Math.abs(corr.correlation) >= 0.7
                        ? 'bg-green-500'
                        : Math.abs(corr.correlation) >= 0.5
                        ? 'bg-blue-500'
                        : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.abs(corr.correlation) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {(Math.abs(corr.correlation) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {correlations.length > limit && (
          <div className="mt-4 pt-4 border-t text-center text-xs text-muted-foreground">
            Showing top {limit} of {correlations.length} significant correlations
          </div>
        )}

        {/* Statistical note */}
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          <p className="leading-relaxed">
            <strong>Note:</strong> Correlations show statistical relationships but do not imply
            causation. Significant correlations have p-value ≤ {maxSignificance} and |r| ≥{' '}
            {minCorrelation}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
