/**
 * ### 🧠 CognitiveBasicView
 *
 * Interface básica para testes cognitivos usando matrizes geradas via servidor.
 * Fluxo simplificado: 4 matrizes sequenciais com feedback imediato.
 *
 * ### 📚 Notes
 * - Matrizes geradas via API do servidor (Gemini 2.5 Pro)
 * - Reutiliza componentes: MatrixGrid, OptionsGrid, ShapeSVG
 * - Sync automático ao finalizar teste
 * - Fallback para modo offline se servidor indisponível
 *
 * ### 🔄 Returns
 * - Componente React com interface de testes cognitivos
 */

import { useState, useCallback, useEffect } from 'react';
import { useCognitiveTests } from '@/hooks/use-cognitive-tests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Brain, Play, CheckCircle, XCircle, Clock, Trophy, Lightning, Target, Timer } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { generateMatrixWithRetry, checkServerHealth } from '../services/serverMatrixService';
import { MatrixGrid } from './MatrixGrid';
import { OptionsGrid } from './OptionsGrid';
import CognitiveAnalytics from './CognitiveAnalytics';
import type { ShapeDefinition } from '../types';
import type { Matrix } from '@/shared/types';

const TOTAL_MATRICES = 4;
const DIFFICULTY = 'normal';

interface MatrixTest {
  matrix: ShapeDefinition[];
  options: ShapeDefinition[];
  correctAnswerIndex: number;
  explanation: string;
  patterns: string[];
  userAnswer?: number;
  wasCorrect?: boolean;
  responseTime: number;
  startTime: number;
}

type TestState = 'idle' | 'loading' | 'in_progress' | 'results';

export default function CognitiveBasicView() {
  const { cognitiveTests, createCognitiveTest, isLoading: isLoadingTests } = useCognitiveTests();
  const [testState, setTestState] = useState<TestState>('idle');
  const [currentMatrixIndex, setCurrentMatrixIndex] = useState(0);
  const [matrices, setMatrices] = useState<MatrixTest[]>([]);
  const [serverAvailable, setServerAvailable] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const currentMatrix = matrices[currentMatrixIndex];

  // Check server health on mount
  useEffect(() => {
    checkServerHealth().then(setServerAvailable);
  }, []);

  /**
   * Inicia um novo teste gerando a primeira matriz
   */
  const startTest = useCallback(async () => {
    if (!serverAvailable) {
      toast.error('Servidor indisponível', {
        description: 'Não foi possível conectar ao servidor de matrizes'
      });
      return;
    }

    console.log('[🔎]: Iniciando novo teste cognitivo...');
    setTestState('loading');
    setMatrices([]);
    setCurrentMatrixIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);

    try {
      // Generate first matrix
      const matrixData = await generateMatrixWithRetry(DIFFICULTY);

      const newMatrix: MatrixTest = {
        ...matrixData,
        responseTime: 0,
        startTime: Date.now()
      };

      setMatrices([newMatrix]);
      setTestState('in_progress');
      console.log('[✅]: Primeira matriz carregada');
    } catch (error) {
      console.error('[❌]: Erro ao iniciar teste:', error);
      toast.error('Erro ao gerar matriz', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      setTestState('idle');
    }
  }, [serverAvailable]);

  /**
   * Processa resposta do usuário
   */
  const handleAnswer = useCallback(async (optionIndex: number) => {
    if (!currentMatrix || showFeedback) return;

    const responseTime = (Date.now() - currentMatrix.startTime) / 1000;
    const wasCorrect = optionIndex === currentMatrix.correctAnswerIndex;

    // Update current matrix with answer
    const updatedMatrix: MatrixTest = {
      ...currentMatrix,
      userAnswer: optionIndex,
      wasCorrect,
      responseTime
    };

    const updatedMatrices = [...matrices];
    updatedMatrices[currentMatrixIndex] = updatedMatrix;
    setMatrices(updatedMatrices);
    setSelectedOption(optionIndex);
    setShowFeedback(true);

    console.log(`[${wasCorrect ? '✅' : '❌'}]: Matriz ${currentMatrixIndex + 1}/${TOTAL_MATRICES} - ${wasCorrect ? 'Correta' : 'Incorreta'} (${responseTime.toFixed(1)}s)`);

    // Auto-advance to next matrix or finish test after 2 seconds
    setTimeout(() => {
      if (currentMatrixIndex < TOTAL_MATRICES - 1) {
        loadNextMatrix();
      } else {
        finishTest(updatedMatrices);
      }
    }, 2000);
  }, [currentMatrix, matrices, currentMatrixIndex, showFeedback]);

  /**
   * Carrega próxima matriz
   */
  const loadNextMatrix = useCallback(async () => {
    setTestState('loading');
    setSelectedOption(null);
    setShowFeedback(false);

    try {
      console.log(`[🔎]: Carregando matriz ${currentMatrixIndex + 2}/${TOTAL_MATRICES}...`);
      const matrixData = await generateMatrixWithRetry(DIFFICULTY);

      const newMatrix: MatrixTest = {
        ...matrixData,
        responseTime: 0,
        startTime: Date.now()
      };

      setMatrices(prev => [...prev, newMatrix]);
      setCurrentMatrixIndex(prev => prev + 1);
      setTestState('in_progress');
      console.log('[✅]: Próxima matriz carregada');
    } catch (error) {
      console.error('[❌]: Erro ao carregar próxima matriz:', error);
      toast.error('Erro ao gerar próxima matriz', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      // Finish test with current matrices if loading fails
      finishTest(matrices);
    }
  }, [currentMatrixIndex, matrices]);

  /**
   * Finaliza teste e salva resultado
   */
  const finishTest = useCallback(async (completedMatrices: MatrixTest[]) => {
    console.log('[🔎]: Finalizando teste...');

    const answeredMatrices = completedMatrices.filter(m => m.userAnswer !== undefined);
    const totalCorrect = answeredMatrices.filter(m => m.wasCorrect).length;
    const accuracy = answeredMatrices.length > 0 ? totalCorrect / answeredMatrices.length : 0;
    const avgResponseTime = answeredMatrices.length > 0
      ? answeredMatrices.reduce((sum, m) => sum + m.responseTime, 0) / answeredMatrices.length
      : 0;

    // Calculate score (weighted by response time)
    const totalScore = answeredMatrices.reduce((sum, m) => {
      const safeTime = Math.max(m.responseTime, 0.1);
      const matrixScore = (m.wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(safeTime)));
      return sum + matrixScore;
    }, 0);

    // Convert to database format
    const matricesForDB: Matrix[] = answeredMatrices.map(m => ({
      matrixId: `matrix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      svgContent: '', // Legacy field
      correctAnswer: m.correctAnswerIndex,
      userAnswer: m.userAnswer!,
      responseTime: m.responseTime,
      wasCorrect: m.wasCorrect!,
      explanation: m.explanation,
      options: m.options.map(() => ''), // Legacy field
      patterns: m.patterns,
      source: 'gemini'
    }));

    const testData = {
      timestamp: Date.now(),
      matrices: matricesForDB,
      totalScore,
      averageResponseTime: avgResponseTime,
      accuracy
    };

    try {
      await createCognitiveTest(testData);
      console.log('[✅]: Teste salvo com sucesso');
      toast.success('Teste concluído!', {
        description: `Score: ${totalScore.toFixed(1)} | Acertos: ${totalCorrect}/${answeredMatrices.length}`
      });
    } catch (error) {
      console.error('[❌]: Erro ao salvar teste:', error);
      toast.error('Erro ao salvar resultado', {
        description: 'O teste foi concluído mas não foi salvo'
      });
    }

    setTestState('results');
  }, [createCognitiveTest]);

  /**
   * Reinicia para novo teste
   */
  const resetTest = useCallback(() => {
    setTestState('idle');
    setMatrices([]);
    setCurrentMatrixIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
  }, []);

  // Render states
  if (testState === 'idle') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-cognitive" weight="duotone" />
              <div>
                <CardTitle>Teste Cognitivo Básico</CardTitle>
                <CardDescription>Matrizes Progressivas de Raven</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete {TOTAL_MATRICES} matrizes lógicas para avaliar seu desempenho cognitivo.
              Cada matriz apresenta um padrão que você deve identificar para escolher a resposta correta.
            </p>

            {!serverAvailable && (
              <Alert variant="destructive">
                <AlertTitle>Servidor Indisponível</AlertTitle>
                <AlertDescription>
                  Não foi possível conectar ao servidor de geração de matrizes.
                  Verifique sua conexão ou tente novamente mais tarde.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={startTest}
              disabled={!serverAvailable}
              size="lg"
              className="w-full"
            >
              <Play className="w-5 h-5 mr-2" weight="fill" />
              Iniciar Teste
            </Button>
          </CardContent>
        </Card>

        {cognitiveTests.length > 0 && (
          <CognitiveAnalytics tests={cognitiveTests} />
        )}
      </div>
    );
  }

  if (testState === 'loading') {
    return (
      <Card className="animate-pulse">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cognitive/20 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-cognitive border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-lg font-medium text-muted-foreground mt-4">
            Gerando matriz {currentMatrixIndex + 1}/{TOTAL_MATRICES}...
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Processando padrões lógicos
          </p>
        </CardContent>
      </Card>
    );
  }

  if (testState === 'in_progress' && currentMatrix) {
    const elapsedTime = Math.floor((Date.now() - currentMatrix.startTime) / 1000);
    const progressPercentage = ((currentMatrixIndex) / TOTAL_MATRICES) * 100;
    
    return (
      <Card className="transition-all duration-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-cognitive" />
                Matriz {currentMatrixIndex + 1}/{TOTAL_MATRICES}
              </CardTitle>
              <CardDescription>Identifique o padrão e escolha a resposta correta</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Timer 
                className={`w-5 h-5 ${elapsedTime > 30 ? 'text-warning animate-pulse' : 'text-muted-foreground'}`} 
                weight="duotone"
              />
              <span className={`text-sm font-medium ${elapsedTime > 30 ? 'text-warning' : 'text-muted-foreground'}`}>
                {elapsedTime}s
              </span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progresso</span>
              <span>{currentMatrixIndex}/{TOTAL_MATRICES}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cognitive/60 to-cognitive transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Matrix Grid */}
          <MatrixGrid 
            shapes={currentMatrix.matrix}
            showAnswer={showFeedback}
            answerShape={showFeedback ? currentMatrix.options[currentMatrix.correctAnswerIndex] : undefined}
          />

          {/* Options Grid */}
          <div>
            <p className="text-sm font-medium mb-3">Escolha a opção que completa a matriz:</p>
            <OptionsGrid
              options={currentMatrix.options}
              correctAnswerIndex={currentMatrix.correctAnswerIndex}
              userAnswer={selectedOption ?? -1}
              onSelectOption={handleAnswer}
              disabled={showFeedback}
            />
          </div>

          {/* Feedback */}
          {showFeedback && (
            <Alert variant={currentMatrix.wasCorrect ? 'default' : 'destructive'}>
              <div className="flex items-start gap-3">
                {currentMatrix.wasCorrect ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" weight="fill" />
                ) : (
                  <XCircle className="w-6 h-6 text-destructive flex-shrink-0" weight="fill" />
                )}
                <div className="flex-1">
                  <AlertTitle>
                    {currentMatrix.wasCorrect ? 'Correto!' : 'Incorreto'}
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="mb-2">{currentMatrix.explanation}</p>
                    {currentMatrix.patterns.length > 0 && (
                      <div className="text-xs">
                        <p className="font-semibold mb-1">Padrões:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {currentMatrix.patterns.map((pattern, i) => (
                            <li key={i}>{pattern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}

          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Progresso: {currentMatrixIndex + 1}/{TOTAL_MATRICES}</span>
            <span>
              {matrices.filter(m => m.wasCorrect).length} acertos
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (testState === 'results') {
    const answeredMatrices = matrices.filter(m => m.userAnswer !== undefined);
    const totalCorrect = answeredMatrices.filter(m => m.wasCorrect).length;
    const accuracy = answeredMatrices.length > 0 ? totalCorrect / answeredMatrices.length : 0;
    const avgResponseTime = answeredMatrices.length > 0
      ? answeredMatrices.reduce((sum, m) => sum + m.responseTime, 0) / answeredMatrices.length
      : 0;

    return (
      <div className="space-y-6">
        <Card className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-cognitive" weight="duotone" />
              <div>
                <CardTitle>Teste Concluído!</CardTitle>
                <CardDescription>Veja seu desempenho abaixo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Score Display */}
            <div className="text-center py-6 bg-gradient-to-br from-cognitive/10 to-cognitive/5 rounded-xl">
              <div className="text-4xl font-bold text-cognitive mb-2">
                {totalCorrect}/{answeredMatrices.length}
              </div>
              <p className="text-sm text-muted-foreground">Matrizes Corretas</p>
              {accuracy >= 0.75 && (
                <p className="text-xs text-cognitive mt-2 font-medium">
                  🏆 Excelente desempenho!
                </p>
              )}
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Target className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold">
                  {(accuracy * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Precisão</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Timer className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold">
                  {avgResponseTime.toFixed(1)}s
                </p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Lightning className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-xl font-bold">
                  {Math.round(100 / (1 + avgResponseTime/10))}
                </p>
                <p className="text-xs text-muted-foreground">Velocidade</p>
              </div>
            </div>

            {/* Individual Results */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Resultados por Matriz:</p>
              <div className="flex gap-2 justify-center">
                {answeredMatrices.map((matrix, idx) => (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-all
                      ${matrix.wasCorrect 
                        ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' 
                        : 'bg-destructive/20 text-destructive border border-destructive/30'}`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={resetTest} size="lg" className="w-full">
              <Play className="w-5 h-5 mr-2" weight="fill" />
              Fazer Novo Teste
            </Button>
          </CardContent>
        </Card>

        <CognitiveAnalytics tests={cognitiveTests} />
      </div>
    );
  }

  return null;
}


