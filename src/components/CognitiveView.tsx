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

  const handleAnswer = async (answerIndex: number) => {
    if (!currentMatrix || isLoading) return

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

    if (!wasCorrect) {
      toast.error('Resposta incorreta', {
        description: completedMatrix.explanation
      })
    } else {
      toast.success('Resposta correta!')
    }

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
            </AlertDescription>
          </Alert>
        )}

        {isLoading || !currentMatrix ? (
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
