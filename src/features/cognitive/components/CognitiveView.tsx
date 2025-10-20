import { useMemo, useState } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Brain, Play } from '@phosphor-icons/react';
import type { CognitiveTest, Matrix } from '@/shared/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line
} from 'recharts';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { cn, safeFormat } from '@/shared/utils';
import {
  PRIMARY_AI_SERVICE_LABEL,
  OFFLINE_MODE_LABEL,
  FALLBACK_DATASET_LABEL,
  buildRemoteServiceUnavailableMessage,
  buildOfflineSuggestionMessage
} from '@/shared/constants/ai';
import {
  requestMatrix,
  getFallbackMatrices,
  hasGeminiSupport,
  MatrixGenerationError,
  type MatrixSource
} from '@/features/cognitive/services/geminiService';

const matrixPrompt = `
You are an expert in psychometrics creating Raven's Progressive Matrices.

INSTRUCTIONS:
1. Create a 3x3 matrix where the first 8 cells follow a logical pattern
2. The 9th cell (bottom right) is empty - this is what the user must complete
3. Difficulty level: medium

PATTERN RULES (choose 1-2 simultaneous patterns):
- Numerical progression of elements
- Systematic rotation (45°, 90°, etc.)
- Shape transformation (circle → square → triangle)
- Fill pattern (solid → striped → empty)
- Spatial position changes
- Overlapping/layering

OUTPUT FORMAT (JSON):
{
  "matrixSVG": "Complete 3x3 grid SVG (viewBox 0 0 600 600)",
  "correctAnswer": number (0-5),
  "options": ["SVG option 0", ..., "SVG option 5"],
  "explanation": "Explanation of the pattern",
  "patterns": ["list of patterns applied"]
}

TECHNICAL REQUIREMENTS:
- Matrix: viewBox 0 0 600 600, cells 200x200 each
- Options: viewBox 0 0 200 200 each
- Use distinct but not vibrant colors
- Subtle grid delimiting cells
- Cell 9 empty/gray with question mark
- 1 correct answer + 5 plausible distractors

Return ONLY valid JSON, no markdown or additional text.
`.trim();

type GenerateMatrixOptions = {
  offline?: boolean;
};

export default function CognitiveView() {
  const [cognitiveTests, setCognitiveTests] = useKV<CognitiveTest[]>('cognitiveTests', []);
  const [testInProgress, setTestInProgress] = useState(false);
  const [currentMatrixIndex, setCurrentMatrixIndex] = useState(0);
  const [currentMatrix, setCurrentMatrix] = useState<Matrix | null>(null);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineIndex, setOfflineIndex] = useState(0);
  const [matrixSource, setMatrixSource] = useState<MatrixSource | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showOfflinePrompt, setShowOfflinePrompt] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const fallbackMatrices = useMemo(() => getFallbackMatrices(), []);
  const fallbackCount = fallbackMatrices.length;
  const [offlineRemaining, setOfflineRemaining] = useState(fallbackCount);

  const generateMatrix = async ({ offline = offlineMode }: GenerateMatrixOptions = {}): Promise<Matrix | null> => {
    if (!offline && !hasSparkSupport() && !hasGeminiSupport()) {
      setAiError(
        `${buildRemoteServiceUnavailableMessage('no navegador')} Mas temos o ${FALLBACK_DATASET_LABEL} pra te salvar.`
      );
    if (!offline && !hasGeminiSupport()) {
      setAiError('A IA não tá configurada por aqui agora, mas temos matrizes cacheadas pra te ajudar.');
      setShowOfflinePrompt(true);
      return null;
    }

    try {
      const result = await requestMatrix(matrixPrompt, {
        allowFallback: offline,
        fallbackIndex: offline ? offlineIndex : undefined
      });

      if (result.source === 'fallback' && !offline) {
        setAiError(
          `Bah, o ${PRIMARY_AI_SERVICE_LABEL} não respondeu agora. ${buildOfflineSuggestionMessage('continuar o treino')}`
        );
        setShowOfflinePrompt(true);
        return null;
      }

      if (result.source === 'fallback' && fallbackCount > 0) {
        setOfflineIndex((prev) => (prev + 1) % fallbackCount);
        setOfflineRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }

      if (result.source !== 'fallback') {
        setOfflineRemaining(fallbackCount);
      }

      setMatrixSource(result.source);
      setAiError(null);
      setShowOfflinePrompt(false);

      return {
        matrixId: result.id ?? uuidv4(),
        svgContent: result.matrixSVG,
        correctAnswer: result.correctAnswer,
        userAnswer: -1,
        responseTime: 0,
        wasCorrect: false,
        explanation: result.explanation,
        options: result.options,
        patterns: result.patterns ?? [],
        source: result.source
      };
    } catch (error) {
      if (error instanceof MatrixGenerationError) {
        if (error.code === 'FALLBACK_REQUIRED' || error.code === 'GEMINI_UNAVAILABLE' || error.code === 'SPARK_UNAVAILABLE') {
          setAiError(
            `Bah, o ${PRIMARY_AI_SERVICE_LABEL} deu uma oscilada. ${buildOfflineSuggestionMessage('seguir no teste')}`
          );
        if (error.code === 'FALLBACK_REQUIRED' || error.code === 'GEMINI_UNAVAILABLE') {
          setAiError('Bah, a IA tá fora do ar agora. Tu pode cancelar ou rodar um teste cacheado.');
          setShowOfflinePrompt(true);
          return null;
        }

        toast.error('Falhou ao gerar a matriz cognitiva', {
          description: error.message
        });
        return null;
      }

      console.error('Error generating matrix:', error);
      toast.error(`Falhou ao requisitar matriz no ${PRIMARY_AI_SERVICE_LABEL}.`);
      return null;
    }
  };

  const startTest = async ({ offline = offlineMode }: GenerateMatrixOptions = {}) => {
    setOfflineMode(offline);
    if (offline) {
      setOfflineIndex(0);
      setOfflineRemaining(fallbackCount);
    }

    setMatrixSource(null);
    setAiError(null);
    setShowOfflinePrompt(false);

    setTestInProgress(true);
    setCurrentMatrixIndex(0);
    setMatrices([]);
    setStartTime(Date.now());

    
    setShowResults(false);
    setIsLoading(true);
    const matrix = await generateMatrix({ offline });
    setIsLoading(false);

    if (matrix) {
      setCurrentMatrix(matrix);
      setStartTime(Date.now());
    } else {
      setTestInProgress(false);
      setOfflineMode(offline);
    }
  };

  const handleLoadOffline = () => {
    if (testInProgress) return;
    startTest({ offline: true });
  };

  const handleCancelOffline = () => {
    setOfflineMode(false);
    setShowOfflinePrompt(false);
    setAiError(null);
    setOfflineRemaining(fallbackCount);
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!currentMatrix || currentMatrix.userAnswer !== -1) return;

    const responseTime = (Date.now() - startTime) / 1000;
    const wasCorrect = answerIndex === currentMatrix.correctAnswer;

    const completedMatrix: Matrix = {
      ...currentMatrix,
      userAnswer: answerIndex,
      responseTime,
      wasCorrect
    };

    setCurrentMatrix(completedMatrix);
    const updatedMatrices = [...matrices, completedMatrix];
    setMatrices(updatedMatrices);

    if (!wasCorrect) {
      toast.error('Incorrect answer', {
        description: completedMatrix.explanation
      });
    } else {
      toast.success('Correct!');
    }

    await new Promise(resolve => setTimeout(resolve, 600));

    if (currentMatrixIndex < 3) {
      setIsLoading(true);
      const nextMatrix = await generateMatrix();
      setIsLoading(false);

      if (nextMatrix) {
        setCurrentMatrix(nextMatrix);
        setCurrentMatrixIndex(currentMatrixIndex + 1);
        setStartTime(Date.now());
      } else {
        finishTest(updatedMatrices);
      }
    } else {
      finishTest(updatedMatrices);
    }
  };

  const finishTest = (completedMatrices: Matrix[]) => {
    const totalCorrect = completedMatrices.filter(m => m.wasCorrect).length;
    const accuracy = completedMatrices.length > 0 ? totalCorrect / completedMatrices.length : 0;
    const avgResponseTime =
      completedMatrices.length > 0
        ? completedMatrices.reduce((sum, m) => sum + m.responseTime, 0) / completedMatrices.length
        : 0;

    const totalScore = completedMatrices.reduce((sum, m) => {
      const safeTime = Math.max(m.responseTime, 0.1);
      const matrixScore = (m.wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(safeTime)));
      return sum + matrixScore;
    }, 0);

    const test: CognitiveTest = {
      id: uuidv4(),
      timestamp: Date.now(),
      matrices: completedMatrices,
      totalScore,
      averageResponseTime: avgResponseTime,
      accuracy,
      createdAt: Date.now()
    };

    setCognitiveTests((current) => [...(current || []), test]);
    setTestInProgress(false);
    setShowResults(true);

    toast.success('Test completed!', {
      description: `Score: ${totalScore.toFixed(1)} | Accuracy: ${(accuracy * 100).toFixed(0)}%`
    });
  };

  const recentTests = [...(cognitiveTests || [])].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  const chartData = useMemo(() => {
    const sortedTests = [...(cognitiveTests || [])].sort((a, b) => a.timestamp - b.timestamp);

    return sortedTests.map(test => ({
      timestamp: safeFormat(test.timestamp, 'HH:mm', 'N/A'),
      time: test.timestamp,
      score: test.totalScore,
      accuracy: test.accuracy * 100,
      avgResponseTime: test.averageResponseTime
    }));
  }, [cognitiveTests]);

  if (testInProgress) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cognitive Test in Progress</h2>
          <p className="text-muted-foreground">Matrix {currentMatrixIndex + 1} of 4</p>
        </div>

        {matrixSource === 'fallback' && (
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <AlertTitle>Modo offline ativado</AlertTitle>
            <AlertDescription>
              {`Bah, o ${PRIMARY_AI_SERVICE_LABEL} tá fora do ar. Estamos usando o ${FALLBACK_DATASET_LABEL} (restam ${offlineRemaining} de ${fallbackCount}).`}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Generating cognitive test matrix...</p>
              </div>
            </CardContent>
          </Card>
        ) : currentMatrix ? (
          <Card>
            <CardHeader>
              <CardTitle>Select the missing pattern</CardTitle>
              <CardDescription>Choose the option that completes the pattern</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: currentMatrix.svgContent }} />

              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                {currentMatrix.options.map((optionSvg, index) => {
                  const isSelected = currentMatrix.userAnswer === index;
                  const showFeedback = currentMatrix.userAnswer !== -1;
                  const isCorrectOption = index === currentMatrix.correctAnswer;
                  const isIncorrectSelection = isSelected && !isCorrectOption;

                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswer(index)}
                      disabled={showFeedback}
                      className={cn(
                        'aspect-square rounded-lg border-2 p-2 transition-all disabled:cursor-not-allowed',
                        showFeedback
                          ? isCorrectOption
                            ? 'border-emerald-500 ring-2 ring-emerald-500/60'
                            : isIncorrectSelection
                              ? 'border-destructive ring-2 ring-destructive/60'
                              : 'border-border/60 opacity-60'
                          : 'border-border hover:border-primary hover:ring-2 hover:ring-primary/50'
                      )}
                    >
                      <div
                        className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: optionSvg }}
                      />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cognitive Testing</h2>
        <p className="text-muted-foreground">Measure your cognitive performance over time</p>
      </div>

      {showResults && matrices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado do último teste</CardTitle>
            <CardDescription>Visualiza teus acertos, padrões e explicações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {matrices.map((matrix, index) => (
              <div key={matrix.matrixId} className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <div className="md:w-1/2">
                    <h4 className="text-sm font-semibold text-muted-foreground">Matriz {index + 1}</h4>
                    <div
                      className="mt-2 w-full overflow-hidden rounded-lg border bg-card [&_svg]:h-full [&_svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: matrix.svgContent }}
                    />
                  </div>
                  <div className="md:w-1/2 space-y-3">
                    <div>
                      <p className="text-sm font-medium">Opções</p>
                      <div className="mt-2 grid grid-cols-3 gap-3">
                        {matrix.options.map((optionSvg, optionIndex) => {
                          const isSelected = matrix.userAnswer === optionIndex;
                          const isCorrectOption = optionIndex === matrix.correctAnswer;
                          const isIncorrectSelection = isSelected && !isCorrectOption;

                          return (
                            <div
                              key={optionIndex}
                              className={cn(
                                'aspect-square rounded-lg border-2 p-2 [&_svg]:h-full [&_svg]:w-full',
                                isCorrectOption
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/60'
                                  : isIncorrectSelection
                                    ? 'border-destructive ring-2 ring-destructive/60'
                                    : isSelected
                                      ? 'border-primary ring-2 ring-primary/50'
                                      : 'border-border/70'
                              )}
                              dangerouslySetInnerHTML={{ __html: optionSvg }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p><span className="font-semibold">Explicação:</span> {matrix.explanation}</p>
                      {matrix.patterns.length > 0 && (
                        <p className="text-muted-foreground">Padrões: {matrix.patterns.join(', ')}</p>
                      )}
                      <p className="text-muted-foreground">
                        Tempo de resposta: {matrix.responseTime.toFixed(1)}s —
                        {matrix.wasCorrect ? ' acertou' : ' errou'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Raven's Progressive Matrices</CardTitle>
          <CardDescription>
            Complete 4 pattern recognition matrices to assess your current cognitive performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <Brain className="w-6 h-6 text-cognitive flex-shrink-0 mt-1" />
            <div className="space-y-2 text-sm">
              <p>This test measures pattern recognition and abstract reasoning abilities.</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You'll complete 4 progressive matrices</li>
                <li>Each matrix has 6 possible answers</li>
                <li>Your score factors in both accuracy and response time</li>
                <li>Take your time to identify the pattern</li>
              </ul>
            </div>
          </div>

          {aiError && (
            <Alert className="border-destructive/40 bg-destructive/10">
              <AlertTitle>IA indisponível</AlertTitle>
              <AlertDescription>
                {aiError}
                <span className="mt-2 block text-xs text-muted-foreground">
                  Temos {fallbackCount} matrizes cacheadas prontas pra rodar mesmo sem conexão com o {PRIMARY_AI_SERVICE_LABEL}.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {showOfflinePrompt && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {`Sem resposta do ${PRIMARY_AI_SERVICE_LABEL} agora. Quer ativar o ${OFFLINE_MODE_LABEL} e rodar o ${FALLBACK_DATASET_LABEL}, índio velho?`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancelOffline} disabled={testInProgress}>
                  Cancelar
                </Button>
                <Button onClick={handleLoadOffline} disabled={testInProgress}>
                  Carregar teste cacheado
                </Button>
              </div>
            </div>
          )}

          <Button onClick={() => startTest({ offline: false })} className="w-full" size="lg" disabled={testInProgress}>
            <Play className="w-5 h-5 mr-2" />
            Start Cognitive Test
          </Button>
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cognitive Performance Trends</CardTitle>
            <CardDescription>Your test scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Score', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    label={{ value: 'Accuracy %', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                  />
                  <Tooltip
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return safeFormat(payload[0].payload.time, 'MMM d, HH:mm', 'N/A');
                      }
                      return label;
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Score') return [value.toFixed(1), name];
                      if (name === 'Accuracy') return [value.toFixed(0) + '%', name];
                      if (name === 'Avg Response Time') return [value.toFixed(1) + 's', name];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="score" fill="hsl(var(--cognitive))" name="Score" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} name="Accuracy" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>Your cognitive performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests completed yet</p>
          ) : (
            <div className="space-y-4">
              {recentTests.map(test => (
                <div key={test.id} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-medium">Score: {test.totalScore.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({(test.accuracy * 100).toFixed(0)}% accuracy)
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Avg response: {test.averageResponseTime.toFixed(1)}s</span>
                        <span>{safeFormat(test.timestamp, 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {test.matrices.map((matrix) => (
                      <div key={matrix.matrixId} className="space-y-3 rounded border p-3">
                        <div className="flex gap-3">
                          <div className="w-24 flex-1 overflow-hidden rounded border bg-card">
                            <div
                              className="h-full w-full [&_svg]:h-full [&_svg]:w-full"
                              dangerouslySetInnerHTML={{ __html: matrix.svgContent }}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {matrix.options.map((optionSvg, optionIndex) => {
                              const isSelected = matrix.userAnswer === optionIndex;
                              const isCorrectOption = optionIndex === matrix.correctAnswer;
                              const isIncorrectSelection = isSelected && !isCorrectOption;

                              return (
                                <div
                                  key={optionIndex}
                                  className={cn(
                                    'h-12 w-12 overflow-hidden rounded border-2 p-1 [&_svg]:h-full [&_svg]:w-full',
                                    isCorrectOption
                                      ? 'border-emerald-500'
                                      : isIncorrectSelection
                                        ? 'border-destructive'
                                        : isSelected
                                          ? 'border-primary'
                                          : 'border-border/70'
                                  )}
                                  dangerouslySetInnerHTML={{ __html: optionSvg }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>{matrix.wasCorrect ? 'Acertou' : 'Errou'} em {matrix.responseTime.toFixed(1)}s</p>
                          {matrix.patterns.length > 0 && (
                            <p>Padrões: {matrix.patterns.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
