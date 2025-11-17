# Testes Cognitivos - Matrizes de Raven

## Visão Geral

Sistema de testes cognitivos baseado em matrizes de Raven (progressive matrices) para monitoramento de função cognitiva ao longo do tratamento psicofarmacológico.

**Objetivo:** Detectar impactos cognitivos (positivos ou negativos) de medicações psiquiátricas através de testes padronizados e rastreamento longitudinal.

---

## 📊 Estado Atual da Implementação

### ✅ Funcionalidades Implementadas

#### 1. Geração de Matrizes

**Integração com Gemini AI:**
- Geração dinâmica de matrizes via Google Gemini
- Prompts estruturados para criar padrões lógicos
- Validação de resposta e parsing de JSON

**Sistema de Fallback:**
- Matrizes pré-cacheadas para modo offline
- Rotação automática de matrizes fallback
- Contador de matrizes offline restantes

**Níveis de Dificuldade:**
- `easy`: Padrões simples (1-2 dimensões)
- `normal`: Padrões moderados (2-3 dimensões)
- `hard`: Padrões complexos (3+ dimensões)

**Tipos de Padrões Suportados:**
- Rotação (horária/anti-horária)
- Progressão de tamanho
- Alternância de cores
- Simetria (horizontal/vertical)
- Mudança de forma
- Combinação de padrões

---

#### 2. Interface de Usuário

**Componentes Principais:**

**`CognitiveView.tsx`** (componente principal)
- Estado do teste (idle, in_progress, results)
- Controle de fluxo (iniciar, responder, próxima)
- Timer por questão
- Feedback visual de acertos/erros

**`MatrixGrid.tsx`** (grid 3x3)
- Renderização da matriz principal
- Célula vazia (bottom-right) como pergunta
- SVG shapes renderizados dinamicamente

**`OptionsGrid.tsx`** (6 opções de resposta)
- Grid de opções de resposta
- Seleção visual
- Feedback de resposta correta/incorreta

**`ShapeSVG.tsx`** (renderizador de formas)
- Renderização de círculos, quadrados, triângulos
- Suporte a cores (red, blue, green, yellow, purple, orange)
- Tipos de preenchimento (solid, outline, striped, dotted)
- Rotação e escala configuráveis

**Features de UX:**
- Mobile-first design
- Animações suaves (Framer Motion)
- Toast notifications (sucesso/erro)
- Modo offline explícito
- Indicador de progresso (X/4 matrizes)

---

#### 3. Persistência e Dados

**Estrutura de Dados (IndexedDB - tabela `cognitiveTests`):**

```typescript
interface CognitiveTest {
  id: string;                    // UUID
  timestamp: number;             // Unix timestamp
  matrices: Matrix[];            // Array de 4 matrizes
  totalScore: number;            // Score total (acerto + velocidade)
  averageResponseTime: number;   // Tempo médio em segundos
  accuracy: number;              // % de acertos (0-1)
  createdAt: number;            // Timestamp de criação
}

interface Matrix {
  matrixId: string;              // UUID da matriz
  svgContent: string;            // SVG da matriz (não usado atualmente)
  options: any[];                // Opções de resposta (não usado)
  correctAnswer: number;         // Índice da resposta correta (0-5)
  userAnswer: number;            // Índice da resposta do usuário
  responseTime: number;          // Tempo de resposta em segundos
  wasCorrect: boolean;           // Se acertou
  explanation: string;           // Explicação do padrão
  patterns: string[];            // Lista de padrões envolvidos
  source: MatrixSource;          // 'gemini' ou 'fallback'
}
```

**Hook de Dados:**
- `useCognitiveTests()` - LiveQuery do Dexie
- CRUD operations: `createCognitiveTest()`
- Ordenação por timestamp (mais recentes primeiro)

---

#### 4. Métricas e Pontuação

**Fórmula de Score:**
```javascript
const itemScore = (wasCorrect ? 1 : 0) * (100 / (1 + Math.log10(Math.max(responseTime, 0.1))));
```

**Componentes do Score:**
- **Acurácia**: Binário (acertou = 1, errou = 0)
- **Velocidade**: Penaliza tempos longos (log scale)
- **Score máximo**: ~100 pontos por item (resposta instantânea e correta)

**Métricas Calculadas:**
- `totalScore`: Soma dos scores de todas as matrizes
- `accuracy`: % de acertos (0.0 a 1.0)
- `averageResponseTime`: Média de tempo em segundos

---

#### 5. Configuração e Segurança

**Variável de Ambiente:**
```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

**Verificação de API:**
```typescript
hasGeminiSupport() // Retorna true se API key configurada
```

**Rate Limiting:**
- Implementado no `GeminiClient`
- Retry logic com backoff exponencial
- Timeout de 30 segundos por request

**Segurança:**
- API key nunca exposta no client
- Requests via HTTPS
- Sem armazenamento de dados sensíveis

---

### ❌ Funcionalidades Não Implementadas

#### 1. Painel de Evolução Temporal

**O que falta:**
- Gráfico de accuracy ao longo do tempo (line chart)
- Gráfico de response time ao longo do tempo
- Indicadores de tendência (melhorando/piorando)
- Médias móveis (7 dias, 30 dias)
- Comparação com baseline individual

**Mockup de UI:**
```
┌─────────────────────────────────────────┐
│ Evolução Cognitiva (30 dias)            │
├─────────────────────────────────────────┤
│                                          │
│   100%─┐                                │
│        │    ●──●                         │
│    75%─┤  ●      ●                       │
│        │●          ●──●                  │
│    50%─┤               ● ─ Accuracy     │
│        │               ●   Avg RT (s)   │
│        └───────────────────────         │
│        1d   7d   14d  21d  30d          │
└─────────────────────────────────────────┘
```

**Timeframes necessários:**
- 7 dias
- 30 dias
- 90 dias
- Tudo (desde o início)

---

#### 2. Análises de Correlação

**Correlação com Medicações:**
- Correlação entre concentração plasmática e performance
- Análise de defasagem temporal (lag)
- Identificação de medicações que impactam cognição
- Gráficos de dispersão (concentração x score)

**Correlação com Humor:**
- Relação entre mood scores e performance cognitiva
- Identificação de padrões (cognição ↓ quando humor ↓)
- Análise multivar iada (humor + ansiedade + energia)

**Análise de Padrões Temporais:**
- Melhor hora do dia para fazer testes
- Efeito de dia da semana
- Impacto de qualidade de sono (futura integração Samsung Health)

**Estatística necessária:**
- Coeficiente de correlação de Spearman
- P-valores para significância
- Intervalos de confiança
- Cross-correlation com lag

---

#### 3. Thresholds e Alertas Clínicos

**Sistema de Baseline:**
- Cálculo de baseline individual (primeiros 5-10 testes)
- Média e desvio padrão de referência
- Atualização periódica do baseline

**Alertas Configuráveis:**
- Queda >20% na accuracy (comparado a baseline)
- Aumento >50% no response time
- 3 testes consecutivos abaixo do baseline
- Tendência de piora (regressão linear)

**Notificações:**
- Toast in-app
- Push notifications (PWA)
- Email summary (opcional, futuro)

**Thresholds Clínicos:**
- Normal: accuracy > 70%
- Atenção: accuracy 50-70%
- Crítico: accuracy < 50%

---

#### 4. Exportação e Relatórios

**Formatos de Export:**
- **CSV**: Para análise em Excel/R/Python
- **PDF**: Relatório visual formatado
- **JSON**: Dados brutos para backup

**Conteúdo do Relatório PDF:**
```
┌──────────────────────────────────────┐
│ Relatório de Testes Cognitivos      │
│ Período: 01/09/2025 - 24/10/2025    │
├──────────────────────────────────────┤
│                                       │
│ Resumo Geral                         │
│ ────────────────                     │
│ Total de testes: 42                  │
│ Accuracy média: 78.5%                │
│ Response time médio: 8.2s            │
│                                       │
│ [Gráfico de Evolução]                │
│                                       │
│ Correlações Identificadas            │
│ ────────────────                     │
│ • Lamotrigina: r = -0.23 (p=0.14)   │
│ • Humor: r = 0.67 (p<0.001) ***     │
│                                       │
│ Alertas                              │
│ ────────────────                     │
│ ⚠ Queda de 15% na semana 3          │
│                                       │
└──────────────────────────────────────┘
```

---

## 🗂️ Estrutura de Arquivos

### Componentes
```
src/features/cognitive/
├── components/
│   ├── CognitiveView.tsx          # Componente principal
│   ├── MatrixGrid.tsx             # Grid 3x3 da matriz
│   ├── OptionsGrid.tsx            # Grid 2x3 de opções
│   └── ShapeSVG.tsx               # Renderizador de SVG shapes
├── pages/
│   └── CognitivePage.tsx          # Page wrapper
├── services/
│   └── geminiService.ts           # Integração Gemini AI
└── types/
    └── index.ts                   # TypeScript types
```

### Hooks
```
src/hooks/
└── use-cognitive-tests.ts         # CRUD operations
```

### Database
```
src/core/database/
└── db.ts                          # Dexie schema (tabela cognitiveTests)
```

---

## 🚀 Roadmap de Implementação

### Fase 1: Painel de Evolução (Estimativa: 5-8 horas)

**Objetivo:** Visualizar performance ao longo do tempo

**Tasks:**
1. Criar `CognitiveEvolutionChart.tsx` *(2h)*
   - Gráfico de linha com accuracy + avgResponseTime
   - Selector de timeframe (7d, 30d, 90d, all)
   - Responsivo (mobile + desktop)

2. Criar hook `useCognitiveEvolution.ts` *(1h)*
   - Agregação de dados por período
   - Cálculo de médias móveis
   - Detecção de tendências (regressão linear)

3. Adicionar métricas agregadas *(1h)*
   - Cards com stats (accuracy média, RT médio, total testes)
   - Indicadores de tendência (↑ ↓ →)
   - Comparação com período anterior

4. Integrar na CognitiveView *(1h)*
   - Tab ou seção separada
   - Loading states
   - Empty states (sem dados)

5. Testes e ajustes finais *(2h)*
   - Popular dados de teste
   - Testar edge cases (1 teste, 100 testes)
   - Ajustes de UI/UX

---

### Fase 2: Correlações (Estimativa: 8-12 horas)

**Objetivo:** Identificar relações entre cognição e medicações/humor

**Tasks:**
1. Criar `CorrelationAnalysis.tsx` *(3h)*
   - Scatter plots (concentração x score)
   - Tabela de coeficientes
   - P-valores e significância visual

2. Implementar cálculos estatísticos *(3h)*
   - Spearman correlation
   - Cross-correlation com lag
   - P-valores e intervalos de confiança

3. Análise temporal *(2h)*
   - Lag analysis (0-48h)
   - Identificar delay de efeito
   - Visualização de lag ótimo

4. UI/UX *(2h)*
   - Tooltips explicativos
   - Filtros (medicação, período)
   - Export de resultados

5. Validação *(2h)*
   - Testar com dados sintéticos
   - Verificar edge cases
   - Validar fórmulas estatísticas

---

### Fase 3: Thresholds & Alertas (Estimativa: 3-5 horas)

**Objetivo:** Alertar usuário sobre mudanças significativas

**Tasks:**
1. Sistema de baseline *(1.5h)*
   - Cálculo automático (primeiros 5-10 testes)
   - Armazenamento em metadata
   - UI para visualizar baseline

2. Detecção de anomalias *(1.5h)*
   - Comparação com baseline
   - Detecção de tendências negativas
   - Cálculo de z-scores

3. Sistema de notificações *(1h)*
   - Toast notifications
   - Badge no menu (se houver alertas)
   - Lista de alertas históricos

4. Configurações *(1h)*
   - Thresholds customizáveis
   - Habilitar/desabilitar alertas
   - Sensibilidade (low/medium/high)

---

### Fase 4: Exportação (Estimativa: 2-3 horas)

**Objetivo:** Permitir export de dados para análise externa

**Tasks:**
1. Export CSV *(0.5h)*
   - Flatten data structure
   - Headers descritivos
   - Download automático

2. Export JSON *(0.5h)*
   - Serialização completa
   - Pretty-print
   - Validação de schema

3. Gerador de PDF *(1.5h)*
   - Biblioteca (jsPDF ou similar)
   - Template de relatório
   - Inclusão de gráficos (canvas)

4. UI de export *(0.5h)*
   - Botões de export
   - Seleção de formato
   - Feedback visual

---

## 📖 Referências Técnicas

### APIs e Bibliotecas

**Integração AI:**
- `@google/generative-ai` - Cliente Gemini
- Endpoint: `gemini-1.5-flash`

**Charts:**
- `recharts` - Gráficos de evolução
- `d3` (opcional) - Scatter plots avançados

**Estatística:**
- `simple-statistics` (opcional) - Correlações e testes
- Implementação manual de Spearman

**Export:**
- `papaparse` - CSV generation
- `jspdf` + `html2canvas` - PDF generation

### Testes de Raven - Literatura

**Referências:**
- Raven, J. (2000). "The Raven's Progressive Matrices"
- Flynn effect: Aumento secular de QI
- Normativas brasileiras: Santos et al. (2010)

**Validação:**
- Correlação com WAIS-IV: r = 0.70-0.85
- Teste-reteste: r = 0.80-0.90
- Sensibilidade a déficits: moderada a alta

---

## 🧪 Como Testar Localmente

### 1. Popular Dados de Teste

```javascript
// Console do navegador
window.seedDemoData({
  clear: true,
  days: 30,
  dosesPerDay: 2,
  moodPerDay: 3,
  includeCognitive: true  // Gera ~15 testes cognitivos
})
```

### 2. Fazer um Teste Manual

1. Navegar para aba "Cognitive"
2. Clicar em "Start New Test"
3. Responder 4 matrizes
4. Ver resultados

### 3. Verificar Persistência

```javascript
// Console
const tests = await db.cognitiveTests.toArray();
console.table(tests.map(t => ({
  date: new Date(t.timestamp).toLocaleDateString(),
  accuracy: `${(t.accuracy * 100).toFixed(1)}%`,
  avgRT: `${t.averageResponseTime.toFixed(1)}s`,
  score: t.totalScore.toFixed(1)
})));
```

### 4. Simular Modo Offline

```javascript
// Desabilitar API key temporariamente
// ou usar flag offline
const matrix = await generateMatrix({ offline: true });
```

---

## 🐛 Known Issues

1. **SVG Rendering:** Fallback matrices não renderizam SVGs (placeholder visual)
2. **Scoring:** Fórmula pode ser ajustada para melhor balanceamento
3. **Difficulty:** Gemini nem sempre respeita nível de dificuldade solicitado
4. **Mobile UX:** Shapes podem ficar pequenas em telas <360px

---

## 📝 Notas de Desenvolvimento

- Matrizes geradas por IA podem ter padrões inconsistentes
- Sempre validar resposta do Gemini (parsing errors possíveis)
- Fallback garante funcionamento sem internet
- Performance: Geração de matriz ~2-5s (Gemini latency)
- Teste completo: ~2-5 minutos (4 matrizes)

---

**Última atualização:** 24/10/2025
**Versão do App:** v0.0.0
**Status:** Parcialmente implementado (core features OK, analytics pendente)
