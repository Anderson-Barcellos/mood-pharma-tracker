import { useMemo, useState } from 'react';
import { GlassCard } from '@/shared/ui/glass-card';
import { Button } from '@/shared/ui/button';
import { 
  Info, 
  ChartBar, 
  Brain,
  Heart,
  Pill,
  Lightning,
  Drop,
  Moon
} from '@phosphor-icons/react';
import { cn } from '@/shared/utils';
import { StatisticsEngine, type MultiVariableCorrelation } from '@/features/analytics/utils/statistics-engine';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip';

interface CorrelationMatrixProps {
  data: Record<string, number[]>;
  className?: string;
  title?: string;
  showSignificance?: boolean;
  colorScheme?: 'diverging' | 'sequential';
}

const getVariableIcon = (varName: string) => {
  const lowerName = varName.toLowerCase();
  if (lowerName.includes('humor') || lowerName.includes('mood')) return <Brain className="w-4 h-4" />;
  if (lowerName.includes('fc') || lowerName.includes('heart')) return <Heart className="w-4 h-4" />;
  if (lowerName.includes('energia') || lowerName.includes('energy')) return <Lightning className="w-4 h-4" />;
  if (lowerName.includes('ansiedade') || lowerName.includes('anxiety')) return <Drop className="w-4 h-4" />;
  if (lowerName.includes('sono') || lowerName.includes('sleep')) return <Moon className="w-4 h-4" />;
  return <Pill className="w-4 h-4" />;
};

const getCorrelationColor = (value: number, scheme: 'diverging' | 'sequential') => {
  if (scheme === 'diverging') {
    // Esquema divergente: azul (negativo) -> branco (zero) -> vermelho (positivo)
    if (value < 0) {
      const intensity = Math.abs(value);
      const blue = Math.round(80 + intensity * 175);
      const red = Math.round(100 + (1 - intensity) * 155);
      const green = Math.round(100 + (1 - intensity) * 155);
      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      const intensity = value;
      const red = Math.round(100 + intensity * 155);
      const blue = Math.round(80 + (1 - intensity) * 175);
      const green = Math.round(80 + (1 - intensity) * 175);
      return `rgb(${red}, ${green}, ${blue})`;
    }
  } else {
    // Esquema sequencial: branco -> roxo
    const intensity = Math.abs(value);
    const purple = Math.round(139 + intensity * 116);
    const base = Math.round(255 - intensity * 140);
    return `rgb(${purple}, ${base}, ${255})`;
  }
};

const getSignificanceSymbol = (pValue: number) => {
  if (pValue < 0.001) return '***';
  if (pValue < 0.01) return '**';
  if (pValue < 0.05) return '*';
  return '';
};

export default function CorrelationMatrix({
  data,
  className,
  title = 'Matriz de Correlações',
  showSignificance = true,
  colorScheme = 'diverging'
}: CorrelationMatrixProps) {
  const [selectedCell, setSelectedCell] = useState<{ i: number; j: number } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ i: number; j: number } | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  const correlationResults = useMemo(() => {
    return StatisticsEngine.multiVariableCorrelation(data);
  }, [data]);

  const { variables, correlationMatrix, pValueMatrix, significantPairs } = correlationResults;

  const formatValue = (value: number) => {
    if (Math.abs(value) === 1) return value > 0 ? '1.00' : '-1.00';
    return value.toFixed(2);
  };

  const getCorrelationStrength = (value: number) => {
    const abs = Math.abs(value);
    if (abs > 0.8) return 'Muito Forte';
    if (abs > 0.6) return 'Forte';
    if (abs > 0.4) return 'Moderada';
    if (abs > 0.2) return 'Fraca';
    return 'Muito Fraca';
  };

  if (variables.length === 0) {
    return (
      <GlassCard className={cn("p-6", className)}>
        <div className="text-center text-muted-foreground">
          <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Dados insuficientes para calcular correlações</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg">
            <ChartBar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">
              Análise de {variables.length} variáveis
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'matrix' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('matrix')}
          >
            Matriz
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            Lista
          </Button>
        </div>
      </div>

      {viewMode === 'matrix' ? (
        <>
          {/* Matriz de Correlações */}
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Header Row */}
              <div className="flex gap-1 mb-1 ml-32">
                {variables.map((varName, i) => (
                  <div
                    key={i}
                    className="w-24 h-8 flex items-center justify-center text-xs font-medium"
                  >
                    <div className="flex items-center gap-1">
                      {getVariableIcon(varName)}
                      <span className="truncate max-w-16" title={varName}>
                        {varName.length > 10 ? varName.substring(0, 8) + '...' : varName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Matrix Rows */}
              {variables.map((rowVar, i) => (
                <div key={i} className="flex gap-1 mb-1">
                  {/* Row Header */}
                  <div className="w-32 h-20 flex items-center justify-end pr-2 text-xs font-medium">
                    <div className="flex items-center gap-1">
                      {getVariableIcon(rowVar)}
                      <span className="truncate max-w-24" title={rowVar}>
                        {rowVar}
                      </span>
                    </div>
                  </div>

                  {/* Matrix Cells */}
                  {variables.map((colVar, j) => {
                    const value = correlationMatrix[i][j];
                    const pValue = pValueMatrix[i][j];
                    const isSelected = selectedCell?.i === i && selectedCell?.j === j;
                    const isHovered = hoveredCell?.i === i && hoveredCell?.j === j;
                    const isDiagonal = i === j;
                    
                    return (
                      <TooltipProvider key={j}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-24 h-20 flex flex-col items-center justify-center rounded-md transition-all cursor-pointer relative",
                                isDiagonal && "opacity-50 cursor-default",
                                isSelected && "ring-2 ring-primary",
                                isHovered && !isDiagonal && "scale-105 shadow-lg z-10"
                              )}
                              style={{
                                backgroundColor: isDiagonal 
                                  ? 'rgba(128, 128, 128, 0.1)' 
                                  : getCorrelationColor(value, colorScheme),
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                              onClick={() => !isDiagonal && setSelectedCell({ i, j })}
                              onMouseEnter={() => setHoveredCell({ i, j })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              <span className="text-sm font-bold text-white drop-shadow-md">
                                {formatValue(value)}
                              </span>
                              {showSignificance && !isDiagonal && (
                                <span className="text-xs text-yellow-300 font-bold absolute top-1 right-1">
                                  {getSignificanceSymbol(pValue)}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          {!isDiagonal && (
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-2">
                                <div className="font-semibold">
                                  {rowVar} ↔ {colVar}
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                  <span className="text-muted-foreground">Correlação:</span>
                                  <span className="font-medium">{formatValue(value)}</span>
                                  <span className="text-muted-foreground">Força:</span>
                                  <span className="font-medium">{getCorrelationStrength(value)}</span>
                                  <span className="text-muted-foreground">P-value:</span>
                                  <span className="font-medium">{pValue.toFixed(4)}</span>
                                  <span className="text-muted-foreground">Significância:</span>
                                  <span className="font-medium">
                                    {pValue < 0.001 ? 'Alta' : pValue < 0.05 ? 'Média' : 'Baixa'}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground pt-1 border-t">
                                  {value > 0 
                                    ? `Quando ${rowVar} aumenta, ${colVar} tende a aumentar`
                                    : `Quando ${rowVar} aumenta, ${colVar} tende a diminuir`}
                                </div>
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legenda */}
          <div className="mt-6 space-y-3">
            {/* Escala de cores */}
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">Escala:</span>
              <div className="flex items-center gap-1">
                <div 
                  className="w-8 h-6 rounded"
                  style={{ backgroundColor: getCorrelationColor(-1, colorScheme) }}
                />
                <span className="text-xs">-1</span>
              </div>
              <div className="flex-1 h-6 rounded"
                style={{
                  background: colorScheme === 'diverging'
                    ? 'linear-gradient(to right, rgb(80, 100, 255), white, rgb(255, 80, 80))'
                    : 'linear-gradient(to right, white, rgb(139, 115, 255))'
                }}
              />
              <div className="flex items-center gap-1">
                <span className="text-xs">+1</span>
                <div 
                  className="w-8 h-6 rounded"
                  style={{ backgroundColor: getCorrelationColor(1, colorScheme) }}
                />
              </div>
            </div>

            {/* Significância */}
            {showSignificance && (
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Significância:</span>
                <span>*** p {'<'} 0.001</span>
                <span>** p {'<'} 0.01</span>
                <span>* p {'<'} 0.05</span>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Vista em Lista - Pares Significativos */
        <div className="space-y-3">
          {significantPairs.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                {significantPairs.length} correlações significativas encontradas (p {'<'} 0.05)
              </p>
              {significantPairs.map((pair, index) => (
                <GlassCard key={index} variant="default" className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getVariableIcon(pair.var1)}
                        <span className="font-medium">{pair.var1}</span>
                      </div>
                      <span className="text-muted-foreground">↔</span>
                      <div className="flex items-center gap-2">
                        {getVariableIcon(pair.var2)}
                        <span className="font-medium">{pair.var2}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold" style={{
                          color: pair.correlation > 0 ? '#22c55e' : '#ef4444'
                        }}>
                          {formatValue(pair.correlation)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getCorrelationStrength(pair.correlation)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          p = {pair.pValue.toFixed(4)}
                        </div>
                        <div className="text-xs text-yellow-500">
                          {getSignificanceSymbol(pair.pValue)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {pair.correlation > 0 
                      ? `Correlação positiva: quando ${pair.var1} aumenta, ${pair.var2} tende a aumentar`
                      : `Correlação negativa: quando ${pair.var1} aumenta, ${pair.var2} tende a diminuir`}
                  </div>
                </GlassCard>
              ))}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma correlação estatisticamente significativa encontrada</p>
              <p className="text-sm mt-2">Colete mais dados para análises mais precisas</p>
            </div>
          )}
        </div>
      )}

      {/* Detalhes da célula selecionada */}
      {selectedCell && viewMode === 'matrix' && (
        <GlassCard variant="default" className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">
              {variables[selectedCell.i]} ↔ {variables[selectedCell.j]}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCell(null)}
            >
              Fechar
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Correlação</p>
              <p className="text-xl font-bold">
                {formatValue(correlationMatrix[selectedCell.i][selectedCell.j])}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">P-value</p>
              <p className="text-xl font-bold">
                {pValueMatrix[selectedCell.i][selectedCell.j].toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Força</p>
              <p className="text-xl font-bold">
                {getCorrelationStrength(correlationMatrix[selectedCell.i][selectedCell.j])}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Direção</p>
              <p className="text-xl font-bold">
                {correlationMatrix[selectedCell.i][selectedCell.j] > 0 ? 'Positiva' : 'Negativa'}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {correlationMatrix[selectedCell.i][selectedCell.j] > 0 
              ? `Quando ${variables[selectedCell.i]} aumenta, ${variables[selectedCell.j]} tende a aumentar proporcionalmente.`
              : `Quando ${variables[selectedCell.i]} aumenta, ${variables[selectedCell.j]} tende a diminuir proporcionalmente.`}
          </p>
        </GlassCard>
      )}
    </GlassCard>
  );
}