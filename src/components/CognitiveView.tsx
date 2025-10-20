import { useCallback, useMemo, useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Brain, Play, Check, X, Warning } from '@phosphor-icons/react'
import type { CognitiveTest, Matrix } from '../lib/types'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { cn, safeFormat } from '@/lib/utils'
import { fetchRavenMatrix } from '@/lib/gemini'

export default function CognitiveView() {
  const [cognitiveTests, setCognitiveTests] = useKV<CognitiveTest[]>('cognitiveTests', [])
  const [testInProgress, setTestInProgress] = useState(false)
  const [currentMatrixIndex, setCurrentMatrixIndex] = useState(0)
  const [currentMatrix, setCurrentMatrix] = useState<Matrix | null>(null)
  const [matrices, setMatrices] = useState<Matrix[]>([])
  const [startTime, setStartTime] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [lastCompletedTest, setLastCompletedTest] = useState<CognitiveTest | null>(null)
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  const loadNextMatrix = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    try {
      const result = await fetchRavenMatrix()

      if (result.source === 'fallback' && !usingFallback) {
        toast.warning('Spark fora do ar. Usando o dataset local de matrizes Raven.')
      }

      setUsingFallback(prev => prev || result.source === 'fallback')

      const safeAnswer = Math.max(0, Math.min(result.correctAnswer, result.options.length - 1))
      const options = result.options.slice(0, 6)

      const matrix: Matrix = {
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Play, Check, X, WarningCircle } from '@phosphor-icons/react';
import type { CognitiveTest, Matrix } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { safeFormat } from '@/lib/utils';
import { GeminiUnavailableError, hasGeminiSupport, requestRavensMatrix } from '@/lib/gemini';

export default function CognitiveView() {
  const [cognitiveTests, setCognitiveTests] = useKV<CognitiveTest[]>('cognitiveTests', []);
  const [testInProgress, setTestInProgress] = useState(false);
  const [currentMatrixIndex, setCurrentMatrixIndex] = useState(0);
  const [currentMatrix, setCurrentMatrix] = useState<Matrix | null>(null);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [useFallbackMatrices, setUseFallbackMatrices] = useState(false);

  const generateMatrix = async (useFallback: boolean): Promise<Matrix | null> => {
    const prompt = `You are an expert in psychometrics creating Raven's Progressive Matrices.
import { Brain, Play } from '@phosphor-icons/react';
import type { Matrix } from '../lib/types';
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
import { cn, safeFormat } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  requestMatrix,
  getFallbackMatrices,
  hasGeminiSupport,
  hasSparkSupport,
  MatrixGenerationError,
  type MatrixSource
} from '@/lib/gemini';
import { useCognitiveTests } from '@/hooks/useCognitiveTests';
import { usePersistentState } from '../lib/usePersistentState';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';

const matrixPrompt = `You are an expert in psychometrics creating Raven's Progressive Matrices.

INSTRUCTIONS:
1. Create a 3x3 matrix where the first 8 cells follow a logical pattern.
2. Leave the bottom-right cell empty for the user to solve.
3. Difficulty level: medium.

PATTERN RULES (choose 1-2 simultaneous patterns):
- Numerical progression of elements
- Systematic rotation (45°, 90°, etc.)
- Shape transformation (circle → square → triangle)
- Fill pattern (solid → striped → empty)
- Spatial position changes
- Overlapping or layering

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
- Use distinct but not overly vibrant colors
- Subtle grid delineating cells
- Cell 9 empty/gray with question mark
- Provide 1 correct answer + 5 distractors

Return ONLY valid JSON, no markdown or extra commentary.`;

type GenerateMatrixOptions = {
  offline?: boolean;
};

export default function CognitiveView() {
  const { cognitiveTests, upsertCognitiveTest } = useCognitiveTests();
  const [cognitiveTests, setCognitiveTests] = usePersistentState<CognitiveTest[]>('cognitiveTests', []);
  const { cognitiveTests, createCognitiveTest } = useCognitiveTests();
  const [testInProgress, setTestInProgress] = useState(false);
  const [currentMatrixIndex, setCurrentMatrixIndex] = useState(0);
  const [currentMatrix, setCurrentMatrix] = useState<Matrix | null>(null);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
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
      setAiError('A IA nativa não tá disponível no navegador, mas temos matrizes cacheadas pra quebrar o galho.');
      setShowOfflinePrompt(true);
      return null;
    }

    try {
      const data = await requestRavensMatrix(prompt, { useFallback });

      return {
        matrixId: uuidv4(),
        svgContent: result.matrixSVG,
        options,
        correctAnswer: safeAnswer,
        userAnswer: -1,
        responseTime: 0,
        wasCorrect: false,
        explanation: result.explanation,
        patterns: result.patterns,
        generationSource: result.source
      }

      setCurrentMatrix(matrix)
      setStartTime(Date.now())
      return true
    } catch (error) {
      console.error('Error generating matrix:', error)
      toast.error('Falhou gerar a matriz do teste cognitivo.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [usingFallback])

  const finishTest = (completedMatrices: Matrix[]) => {
    if (completedMatrices.length === 0) {
      setTestInProgress(false)
      setCurrentMatrix(null)
      setMatrices([])
      setUsingFallback(false)
      setCurrentMatrixIndex(0)
      return
        explanation: data.explanation
      };
      const result = await requestMatrix(matrixPrompt, {
        allowFallback: offline,
        fallbackIndex: offline ? offlineIndex : undefined
      });

      if (result.source === 'fallback' && !offline) {
        setAiError('Bah, nenhum provedor de IA respondeu agora. Quer usar o teste cacheado?');
        setShowOfflinePrompt(true);
        return null;
      }

      if (result.source === 'fallback' && fallbackCount > 0) {
        setOfflineIndex((prev) => (prev + 1) % fallbackCount);
        setOfflineRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      } else {
        setOfflineRemaining(fallbackCount);
      }

      setMatrixSource(result.source);
      setAiError(null);
      setShowOfflinePrompt(false);

      const safeOptions = Array.isArray(result.options) ? result.options : [];
      const safePatterns = Array.isArray(result.patterns) ? result.patterns : [];

      return {
        matrixId: result.id ?? uuidv4(),
        svgContent: result.matrixSVG,
        options: safeOptions,
        patterns: safePatterns,
        correctAnswer: result.correctAnswer,
        userAnswer: -1,
        responseTime: 0,
        wasCorrect: false,
        explanation: result.explanation,
        options: result.options,
        patterns: result.patterns,
        explanation: result.explanation ?? 'No explanation provided.',
        source: result.source
      };
        return {
          matrixId: result.id ?? uuidv4(),
          svgContent: result.matrixSVG,
          correctAnswer: result.correctAnswer,
          userAnswer: -1,
          responseTime: 0,
          wasCorrect: false,
          explanation: result.explanation,
          options: result.options,
          patterns: result.patterns,
          source: result.source
        };
    } catch (error) {
      if (error instanceof MatrixGenerationError) {
        if (error.code === 'FALLBACK_REQUIRED' || error.code === 'GEMINI_UNAVAILABLE' || error.code === 'SPARK_UNAVAILABLE') {
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
      if (error instanceof GeminiUnavailableError) {
        setAiUnavailable(true);
        toast.error('Bah, o Spark sumiu. Usa o teste cacheado ou tenta de novo mais tarde.');
      } else {
        toast.error('Failed to generate cognitive test matrix');
      }
      return null;
    }

    const totalCorrect = completedMatrices.filter(matrix => matrix.wasCorrect).length
    const accuracy = totalCorrect / completedMatrices.length
    const avgResponseTime =
      completedMatrices.reduce((sum, matrix) => sum + matrix.responseTime, 0) / completedMatrices.length

    const totalScore = completedMatrices.reduce((sum, matrix) => {
      const matrixScore = (matrix.wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(Math.max(matrix.responseTime, 1))))
      return sum + matrixScore
    }, 0)

    const test: CognitiveTest = {
      id: uuidv4(),
      timestamp: Date.now(),
      matrices: completedMatrices,
      totalScore,
      averageResponseTime: avgResponseTime,
      accuracy,
      createdAt: Date.now()
    }

    setCognitiveTests(current => [...(current || []), test])
    setLastCompletedTest(test)
    setExpandedTestId(test.id)
    setShowResults(true)
    setTestInProgress(false)
    setCurrentMatrix(null)
    setMatrices([])
    setUsingFallback(false)
    setCurrentMatrixIndex(0)
    setStartTime(0)

    toast.success('Teste concluído!', {
      description: `Score: ${totalScore.toFixed(1)} | Acerto: ${(accuracy * 100).toFixed(0)}%`
    })
  }

  const startTest = async () => {
    setTestInProgress(true)
    setCurrentMatrixIndex(0)
    setCurrentMatrix(null)
    setMatrices([])
    setShowResults(false)
    setUsingFallback(false)

    const loaded = await loadNextMatrix()

    if (!loaded) {
      setTestInProgress(false)
      setCurrentMatrix(null)
      setIsLoading(false)
      if (lastCompletedTest) {
        setShowResults(true)
      }
      toast.error('Não rolou iniciar o teste agora.')
  const startTest = async ({ useFallback = false }: { useFallback?: boolean } = {}) => {
    if (!useFallback && !hasGeminiSupport()) {
      setAiUnavailable(true);
      toast.info('Tchê, não rolou acesso à IA agora. Quer puxar um teste cacheado?');
      return;
    }

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
    setAiUnavailable(false);
    setUseFallbackMatrices(useFallback);

    setIsLoading(true);
    const matrix = await generateMatrix(useFallback);

    
    setShowResults(false);
    setIsLoading(true);
    const matrix = await generateMatrix({ offline });
    setIsLoading(false);

    if (matrix) {
      setCurrentMatrix(matrix);
      setStartTime(Date.now());
    } else {
      setTestInProgress(false);
      if (!useFallback) {
        toast.error('Failed to start test');
      }
      setOfflineMode(offline);
    }
  }

  const cancelTest = () => {
    setTestInProgress(false)
    setCurrentMatrix(null)
    setMatrices([])
    setCurrentMatrixIndex(0)
    setIsLoading(false)
    setStartTime(0)
    setUsingFallback(false)
    if (lastCompletedTest) {
      setShowResults(true)
    }
    toast('Teste cancelado.')
  }

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
    if (!currentMatrix || isLoading) return
    if (!currentMatrix || currentMatrix.userAnswer !== -1) return;

    const responseTime = (Date.now() - startTime) / 1000
    const wasCorrect = answerIndex === currentMatrix.correctAnswer

    const completedMatrix: Matrix = {
      ...currentMatrix,
      userAnswer: answerIndex,
      responseTime,
      wasCorrect
    }

    const updatedMatrices = [...matrices, completedMatrix]
    setMatrices(updatedMatrices)
    setCurrentMatrix(completedMatrix);
    const updatedMatrices = [...matrices, completedMatrix];
    setMatrices(updatedMatrices);

    if (!wasCorrect) {
      toast.error('Resposta incorreta', {
        description: completedMatrix.explanation
      })
    } else {
      toast.success('Resposta correta!')
    }

    await new Promise(resolve => setTimeout(resolve, 600));

    if (currentMatrixIndex < 3) {
      const nextIndex = currentMatrixIndex + 1
      setCurrentMatrixIndex(nextIndex)
      const loaded = await loadNextMatrix()
      if (!loaded) {
        finishTest(updatedMatrices)
      }
    } else {
      finishTest(updatedMatrices)
    }
  }

  const toggleExpandedTest = (testId: string) => {
    setExpandedTestId(prev => (prev === testId ? null : testId))
  }

  const recentTests = [...(cognitiveTests || [])]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)

  const chartData = useMemo(() => {
    const sortedTests = [...(cognitiveTests || [])].sort((a, b) => a.timestamp - b.timestamp)
      setIsLoading(true);
      setStartTime(Date.now());
      const nextMatrix = await generateMatrix(useFallbackMatrices);
      const nextMatrix = await generateMatrix();
      setIsLoading(false);

      if (nextMatrix) {
        setCurrentMatrix(nextMatrix);
        setCurrentMatrixIndex(currentMatrixIndex + 1);
        setStartTime(Date.now());
      } else {
        await finishTest(updatedMatrices);
      }
    } else {
      await finishTest(updatedMatrices);
    }
  };

  const finishTest = (completedMatrices: Matrix[]) => {
    if (completedMatrices.length === 0) {
      setTestInProgress(false);
      setIsLoading(false);
      setUseFallbackMatrices(false);
      return;
    }

  const finishTest = async (completedMatrices: Matrix[]) => {
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

    const now = Date.now();
    await createCognitiveTest({
      timestamp: now,
      matrices: completedMatrices,
      totalScore,
      averageResponseTime: avgResponseTime,
      accuracy,
      createdAt: Date.now()
    };

    try {
      await upsertCognitiveTest(test);
    } catch (error) {
      console.error('Failed to persist cognitive test', error);
      toast.error('Falhou ao salvar o teste cognitivo');
    }
      createdAt: now
    });
    setShowResults(true);
    setTestInProgress(false);
    setShowResults(true);
    setUseFallbackMatrices(false);

    toast.success('Test completed!', {
      description: `Score: ${totalScore.toFixed(1)} | Accuracy: ${(accuracy * 100).toFixed(0)}%`
    });
  };

  const recentTests = [...cognitiveTests].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

  const chartData = useMemo(() => {
    const sortedTests = [...cognitiveTests].sort((a, b) => a.timestamp - b.timestamp);

    return sortedTests.map(test => ({
      timestamp: safeFormat(test.timestamp, 'HH:mm', 'N/A'),
      time: test.timestamp,
      score: test.totalScore,
      accuracy: test.accuracy * 100,
      avgResponseTime: test.averageResponseTime
    }))
  }, [cognitiveTests])

  const lastTestUsedFallback = lastCompletedTest?.matrices.some(matrix => matrix.generationSource === 'fallback') ?? false

  if (testInProgress) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Teste cognitivo em andamento</h2>
            <p className="text-muted-foreground">Matriz {Math.min(currentMatrixIndex + 1, 4)} de 4</p>
          </div>
          <Button variant="outline" onClick={cancelTest} disabled={isLoading}>
            Cancelar teste
          </Button>
        </div>

        {usingFallback && (
          <Alert className="border-amber-400/70 bg-amber-50 text-amber-900">
            <Warning className="h-5 w-5" weight="bold" />
            <AlertTitle>Modo offline</AlertTitle>
            <AlertDescription>
              Não rolou falar com o Spark/Gemini agora, então estamos usando matrizes Raven do dataset local.
        {useFallbackMatrices && (
          <div className="p-4 border border-dashed rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Teste rodando com o dataset cacheado enquanto a IA não volta.
          </div>
        {matrixSource === 'fallback' && (
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <AlertTitle>Modo offline ativado</AlertTitle>
            <AlertDescription>
              Bah, a IA tá fora do ar. Estamos usando o conjunto cacheado de matrizes (restam {offlineRemaining} de {fallbackCount}).
            </AlertDescription>
          </Alert>
        )}

        {isLoading || !currentMatrix ? (
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
                <p className="text-muted-foreground">Gerando matriz cognitiva...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Completa o padrão</CardTitle>
              <CardDescription>Escolhe a alternativa que fecha a matriz Raven</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div
                  className="max-w-[520px] w-full"
                  dangerouslySetInnerHTML={{ __html: currentMatrix.svgContent }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currentMatrix.options.map((optionSvg, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    disabled={isLoading}
                    className={cn(
                      'relative flex aspect-square items-center justify-center rounded-lg border-2 border-border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      isLoading && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <div
                      className="pointer-events-none flex h-full w-full items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: optionSvg }}
                    />
                  </button>
                ))}
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
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cognitive Testing</h2>
        <p className="text-muted-foreground">Acompanha tua curva cognitiva com matrizes Raven sob demanda</p>
      </div>

      {aiUnavailable && !testInProgress && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WarningCircle className="w-5 h-5 text-destructive" weight="bold" />
              Assistente de IA indisponível
            </CardTitle>
            <CardDescription>
              Bah, índio velho, o Spark ou o Gemini deram uma sumida. Quer cancelar ou carregar um teste cacheado pra treinar mesmo assim?
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="sm:w-auto" onClick={() => { setAiUnavailable(false); setUseFallbackMatrices(false); }}>
              Cancelar
            </Button>
            <Button className="sm:w-auto" onClick={() => startTest({ useFallback: true })}>
              Carregar teste cacheado
            </Button>
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
          <CardTitle>Matrizes progressivas de Raven</CardTitle>
          <CardDescription>
            Roda quatro matrizes sequenciais e mede velocidade de processamento junto da taxa de acerto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4 rounded-lg bg-muted p-4">
            <Brain className="h-6 w-6 flex-shrink-0 text-cognitive" />
            <div className="space-y-2 text-sm">
              <p>Esse teste avalia raciocínio abstrato e reconhecimento de padrões.</p>
              <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                <li>São 4 matrizes com 6 alternativas cada</li>
                <li>Score pondera acerto com tempo de resposta</li>
                <li>Dá pra pausar a qualquer momento sem perder histórico</li>
              </ul>
            </div>
          </div>
          <Button onClick={startTest} className="w-full" size="lg">
            <Play className="mr-2 h-5 w-5" />
            Iniciar teste cognitivo
          <Button onClick={() => startTest()} className="w-full" size="lg">

          {aiError && (
            <Alert className="border-destructive/40 bg-destructive/10">
              <AlertTitle>IA indisponível</AlertTitle>
              <AlertDescription>
                {aiError}
                <span className="mt-2 block text-xs text-muted-foreground">
                  Temos {fallbackCount} matrizes cacheadas prontas pra rodar mesmo sem conexão com os provedores.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {showOfflinePrompt && (
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Sem IA por enquanto. Quer carregar um teste cacheado ou deixar pra depois, índio velho?
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

      {showResults && lastCompletedTest && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do último teste</CardTitle>
            <CardDescription>{safeFormat(lastCompletedTest.timestamp, 'MMM d, yyyy HH:mm', 'N/A')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {lastTestUsedFallback && (
              <Alert className="border-amber-400/70 bg-amber-50 text-amber-900">
                <Warning className="h-5 w-5" weight="bold" />
                <AlertTitle>Matrizes offline</AlertTitle>
                <AlertDescription>
                  Esse teste usou matrizes do fallback local porque o serviço de IA não respondeu.
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Score total: {lastCompletedTest.totalScore.toFixed(1)}</span>
              <span>Acerto: {(lastCompletedTest.accuracy * 100).toFixed(0)}%</span>
              <span>Tempo médio: {lastCompletedTest.averageResponseTime.toFixed(1)}s</span>
              <span>Matrizes corretas: {lastCompletedTest.matrices.filter(matrix => matrix.wasCorrect).length}/
                {lastCompletedTest.matrices.length}
              </span>
            </div>

            <div className="space-y-6">
              {lastCompletedTest.matrices.map((matrix, index) => (
                <div key={matrix.matrixId} className="space-y-4 rounded-lg border p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:gap-6">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Matriz {index + 1}</p>
                      <div
                        className="mt-3 flex w-full justify-center rounded-lg border bg-card p-3"
                        dangerouslySetInnerHTML={{ __html: matrix.svgContent }}
                      />
                    </div>
                    <div className="flex-1 space-y-3 text-sm text-muted-foreground">
                      <div className="flex flex-wrap gap-2">
                        {matrix.patterns.map(pattern => (
                          <Badge key={pattern} variant="outline">
                            {pattern}
                          </Badge>
                        ))}
                      </div>
                      <p>{matrix.explanation}</p>
                      <p>
                        Tempo de resposta: {matrix.responseTime.toFixed(1)}s — Resultado:{' '}
                        {matrix.wasCorrect ? 'acertou' : 'errou'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {matrix.options.map((optionSvg, optionIndex) => {
                      const isCorrect = optionIndex === matrix.correctAnswer
                      const isUser = optionIndex === matrix.userAnswer
                      return (
                        <div
                          key={optionIndex}
                          className={cn(
                            'rounded-lg border bg-card p-2 transition-shadow',
                            isCorrect && 'border-emerald-500 ring-2 ring-emerald-200',
                            isUser && !isCorrect && 'border-destructive ring-2 ring-destructive/30',
                            isUser && isCorrect && 'bg-emerald-50'
                          )}
                        >
                          <div
                            className="flex aspect-square w-full items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: optionSvg }}
                          />
                          <div className="mt-2 text-center text-xs text-muted-foreground">
                            {isCorrect ? 'Correta' : isUser ? 'Tua escolha' : 'Distrator'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendência cognitiva</CardTitle>
            <CardDescription>Evolução de score, acerto e tempo médio</CardDescription>
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
                    label={{ value: 'Acerto %', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                  />
                  <Tooltip
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return safeFormat(payload[0].payload.time, 'MMM d, HH:mm', 'N/A')
                      }
                      return label
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Score') return [Number(value).toFixed(1), name]
                      if (name === 'Acerto') return [`${Number(value).toFixed(0)}%`, name]
                      if (name === 'Tempo médio') return [`${Number(value).toFixed(1)}s`, name]
                      return [value, name]
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="score" fill="hsl(var(--cognitive))" name="Score" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Acerto"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="avgResponseTime"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    name="Tempo médio"
                    dot={{ r: 4 }}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={2} name="Accuracy" dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de testes</CardTitle>
          <CardDescription>Volta nas matrizes e confere onde acertou ou errou</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum teste completado ainda</p>
          ) : (
            <div className="space-y-4">
              {recentTests.map(test => {
                const usedFallback = test.matrices.some(matrix => matrix.generationSource === 'fallback')
                return (
                  <div key={test.id} className="space-y-3 rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-medium">Score: {test.totalScore.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground">({(test.accuracy * 100).toFixed(0)}% de acerto)</span>
                          {usedFallback && <Badge variant="secondary">Offline</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>Tempo médio: {test.averageResponseTime.toFixed(1)}s</span>
                          <span>{safeFormat(test.timestamp, 'MMM d, yyyy HH:mm', 'N/A')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {test.matrices.map((matrix, i) => (
                            <div key={i} className="flex h-8 w-8 items-center justify-center rounded border">
                              {matrix.wasCorrect ? (
                                <Check className="h-4 w-4 text-primary" weight="bold" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" weight="bold" />
                              )}
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => toggleExpandedTest(test.id)}>
                          {expandedTestId === test.id ? 'Esconder' : 'Detalhar'}
                        </Button>
                      </div>
                    </div>
                    {expandedTestId === test.id && (
                      <div className="space-y-4 pt-2">
                    {test.matrices.map(matrix => (
                      <div key={matrix.matrixId} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div
                          className="flex items-center justify-center rounded-lg border bg-card p-3"
                          dangerouslySetInnerHTML={{ __html: matrix.svgContent }}
                        />
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                              {matrix.options.map((optionSvg, optionIndex) => {
                                const isCorrect = optionIndex === matrix.correctAnswer
                                const isUser = optionIndex === matrix.userAnswer
                                return (
                                  <div
                                    key={optionIndex}
                                    className={cn(
                                      'rounded-lg border bg-card p-2 text-xs text-muted-foreground',
                                      isCorrect && 'border-emerald-500 ring-1 ring-emerald-200',
                                      isUser && !isCorrect && 'border-destructive/80 ring-1 ring-destructive/30',
                                      isUser && isCorrect && 'bg-emerald-50'
                                    )}
                                  >
                                    <div
                                      className="flex aspect-square w-full items-center justify-center"
                                      dangerouslySetInnerHTML={{ __html: optionSvg }}
                                    />
                                    <div className="mt-1 text-center">
                                      {isCorrect ? 'Correta' : isUser ? 'Tua escolha' : 'Distrator'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
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
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
