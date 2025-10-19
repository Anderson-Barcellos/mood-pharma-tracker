import { useState, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Play, Check, X } from '@phosphor-icons/react';
import type { CognitiveTest, Matrix } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, ComposedChart } from 'recharts';
import { safeFormat } from '@/lib/utils';

export default function CognitiveView() {
  const [cognitiveTests, setCognitiveTests] = useKV<CognitiveTest[]>('cognitiveTests', []);
  const [testInProgress, setTestInProgress] = useState(false);
  const [currentMatrixIndex, setCurrentMatrixIndex] = useState(0);
  const [currentMatrix, setCurrentMatrix] = useState<Matrix | null>(null);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const generateMatrix = async (): Promise<Matrix | null> => {
    const prompt = `You are an expert in psychometrics creating Raven's Progressive Matrices.

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

Return ONLY valid JSON, no markdown or additional text.`;

    try {
      const response = await window.spark.llm(prompt, 'gpt-4o', true);
      const data = JSON.parse(response);
      
      return {
        matrixId: uuidv4(),
        svgContent: data.matrixSVG,
        correctAnswer: data.correctAnswer,
        userAnswer: -1,
        responseTime: 0,
        wasCorrect: false,
        explanation: data.explanation
      };
    } catch (error) {
      console.error('Error generating matrix:', error);
      toast.error('Failed to generate cognitive test matrix');
      return null;
    }
  };

  const startTest = async () => {
    setTestInProgress(true);
    setCurrentMatrixIndex(0);
    setMatrices([]);
    setShowResults(false);
    setStartTime(Date.now());
    
    setIsLoading(true);
    const matrix = await generateMatrix();
    setIsLoading(false);
    
    if (matrix) {
      setCurrentMatrix(matrix);
    } else {
      setTestInProgress(false);
      toast.error('Failed to start test');
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!currentMatrix) return;

    const responseTime = (Date.now() - startTime) / 1000;
    const wasCorrect = answerIndex === currentMatrix.correctAnswer;

    const completedMatrix: Matrix = {
      ...currentMatrix,
      userAnswer: answerIndex,
      responseTime,
      wasCorrect
    };

    const updatedMatrices = [...matrices, completedMatrix];
    setMatrices(updatedMatrices);

    if (!wasCorrect) {
      toast.error('Incorrect answer', {
        description: completedMatrix.explanation
      });
    } else {
      toast.success('Correct!');
    }

    if (currentMatrixIndex < 3) {
      setIsLoading(true);
      setStartTime(Date.now());
      const nextMatrix = await generateMatrix();
      setIsLoading(false);
      
      if (nextMatrix) {
        setCurrentMatrix(nextMatrix);
        setCurrentMatrixIndex(currentMatrixIndex + 1);
      } else {
        finishTest(updatedMatrices);
      }
    } else {
      finishTest(updatedMatrices);
    }
  };

  const finishTest = (completedMatrices: Matrix[]) => {
    const totalCorrect = completedMatrices.filter(m => m.wasCorrect).length;
    const accuracy = totalCorrect / completedMatrices.length;
    const avgResponseTime = completedMatrices.reduce((sum, m) => sum + m.responseTime, 0) / completedMatrices.length;
    
    const totalScore = completedMatrices.reduce((sum, m) => {
      const matrixScore = (m.wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(m.responseTime)));
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
    setShowResults(true);
    setTestInProgress(false);
    
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
                {[0, 1, 2, 3, 4, 5].map(index => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="aspect-square border-2 border-border hover:border-primary rounded-lg p-4 transition-colors"
                  >
                    <span className="text-sm font-medium text-muted-foreground">Option {index + 1}</span>
                  </button>
                ))}
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
          <Button onClick={startTest} className="w-full" size="lg">
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
                  <XAxis 
                    dataKey="timestamp"
                    tick={{ fontSize: 11 }}
                  />
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
                  <Bar 
                    yAxisId="left"
                    dataKey="score" 
                    fill="hsl(var(--cognitive))"
                    name="Score"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Accuracy"
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
          <CardTitle>Test History</CardTitle>
          <CardDescription>Your cognitive performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests completed yet</p>
          ) : (
            <div className="space-y-4">
              {recentTests.map(test => (
                <div key={test.id} className="flex items-center justify-between p-4 rounded-lg border">
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
                  <div className="flex gap-1">
                    {test.matrices.map((matrix, i) => (
                      <div key={i} className="w-8 h-8 rounded flex items-center justify-center border">
                        {matrix.wasCorrect ? (
                          <Check className="w-4 h-4 text-primary" weight="bold" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" weight="bold" />
                        )}
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
