import type { Medication } from '@/shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import type { LaggedCorrelation } from '@/features/analytics/utils/correlations';

interface CorrelationSummaryProps {
  medication: Medication;
  moodVsConcentration: LaggedCorrelation[];
  moodVsHeartRate: LaggedCorrelation[];
  concentrationVsHeartRate: LaggedCorrelation[];
}

function bestByStrength(rows: LaggedCorrelation[]): LaggedCorrelation | null {
  if (!rows.length) return null;
  return [...rows].sort((a, b) => Math.abs(b.r) - Math.abs(a.r))[0] ?? null;
}

function formatR(r: number): string {
  if (!Number.isFinite(r)) return '0.00';
  return r.toFixed(2);
}

export function CorrelationSummary({
  medication,
  moodVsConcentration,
  moodVsHeartRate,
  concentrationVsHeartRate,
}: CorrelationSummaryProps) {
  const bestMoodConc = bestByStrength(moodVsConcentration);
  const bestMoodHr = bestByStrength(moodVsHeartRate);
  const bestConcHr = bestByStrength(concentrationVsHeartRate);

  const rows = [
    {
      label: 'Mood ↔ concentração',
      best: bestMoodConc,
      data: moodVsConcentration,
    },
    {
      label: 'Mood ↔ FC',
      best: bestMoodHr,
      data: moodVsHeartRate,
    },
    {
      label: 'Concentração ↔ FC',
      best: bestConcHr,
      data: concentrationVsHeartRate,
    },
  ];

  const hasAny = rows.some((row) => (row.best?.n ?? 0) >= 3);
  if (!hasAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Correlação (Mood, {medication.name}, FC)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Dados insuficientes para calcular correlações. Registre mais pontos de humor e
            doses/FC dentro da janela selecionada.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Correlação (Mood, {medication.name}, FC)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="text-muted-foreground border-b">
              <th className="text-left py-1 pr-2">Par</th>
              <th className="text-right py-1 px-2">Lag</th>
              <th className="text-right py-1 px-2">r</th>
              <th className="text-right py-1 pl-2">n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.data.map((entry) => (
                <tr key={`${row.label}-${entry.lagHours}`} className="border-b last:border-b-0">
                  <td className="py-1 pr-2 align-middle">{row.label}</td>
                  <td className="py-1 px-2 text-right align-middle">
                    {entry.lagHours === 0
                      ? '0 h'
                      : entry.lagHours > 0
                      ? `+${entry.lagHours} h`
                      : `${entry.lagHours} h`}
                  </td>
                  <td className="py-1 px-2 text-right align-middle font-mono">
                    {entry.n >= 3 ? formatR(entry.r) : '—'}
                  </td>
                  <td className="py-1 pl-2 text-right align-middle">{entry.n}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>

        <p className="text-xs text-muted-foreground pt-2">
          Lag positivo significa que o valor da direita (ex.: Mood) é observado horas depois do da
          esquerda (ex.: concentração). Use isso para enxergar efeitos atrasados das medicações e
          da fisiologia no humor.
        </p>
      </CardContent>
    </Card>
  );
}

