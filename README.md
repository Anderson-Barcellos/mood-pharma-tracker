## 1. Visão Geral do Projeto

### 1.1 Propósito Clínico

Este aplicativo web foi concebido para preencher uma lacuna crítica no monitoramento terapêutico de pacientes psiquiátricos, particularmente aqueles em uso de múltiplos psicotrópicos. O objetivo central é criar uma ferramenta que permita correlacionar objetivamente concentrações séricas estimadas de medicamentos com estados emocionais e desempenho cognitivo ao longo do tempo.

Na prática clínica neuropsiquiátrica moderna, frequentemente ajustamos doses de medicamentos baseados em relatos subjetivos de melhora ou piora sintomatológica, sem uma compreensão quantitativa precisa de como as concentrações plasmáticas desses fármacos se relacionam com o estado clínico do paciente. Este aplicativo busca transformar essa relação implícita em dados explícitos e analisáveis.

### 1.2 Objetivos Funcionais Primários

O aplicativo deve permitir que usuários (pacientes ou clínicos acompanhando seus próprios tratamentos) registrem sistematicamente três tipos fundamentais de dados: momentos de administração medicamentosa com suas respectivas dosagens, estados emocionais/humor ao longo do dia, e desempenho em testes cognitivos padronizados. A partir desses dados, o sistema calcula concentrações séricas estimadas usando modelos farmacocinéticos apropriados para cada medicamento, e então executa análises estatísticas sofisticadas para identificar correlações temporais entre níveis medicamentosos e bem-estar psicológico.

### 1.3 Valor Terapêutico

A capacidade de visualizar graficamente como mudanças na posologia ou na aderência medicamentosa se correlacionam com flutuações de humor pode empoderar pacientes a compreenderem melhor seus tratamentos. Para clínicos, oferece uma ferramenta de monitoramento terapêutico que vai além do relato anedótico, permitindo ajustes posológicos baseados em evidência quantitativa individual.

## 2. Arquitetura Técnica

### 2.1 Stack Tecnológico

O aplicativo será construído como uma Single Page Application (SPA) usando React 18+ como framework frontend principal. A escolha do React se justifica pela sua arquitetura componetizada que facilita a modularização das diferentes funcionalidades do sistema, além de seu ecossistema robusto de bibliotecas para visualização de dados e gerenciamento de estado.

Para visualização de dados, utilizaremos Recharts como biblioteca principal de gráficos. Recharts foi escolhido por sua API declarativa que se integra naturalmente com o paradigma React, sua capacidade de criar gráficos responsivos nativamente, e seu suporte robusto para múltiplas séries de dados sobrepostas, essencial para visualizar concentrações de múltiplos medicamentos simultaneamente.

O gerenciamento de estado global será implementado usando Context API do React combinado com useReducer para operações mais complexas. Essa abordagem é suficiente para a complexidade do projeto e evita a overhead de bibliotecas como Redux, mantendo o bundle size menor.

Para estilização, usaremos Tailwind CSS para desenvolvimento rápido e consistente, com CSS Modules para componentes que necessitem estilização mais específica. A combinação dessas abordagens permite tanto velocidade de desenvolvimento quanto controle granular quando necessário.

### 2.2 Persistência de Dados

A persistência será implementada usando IndexedDB através da biblioteca Dexie.js, que fornece uma interface Promise-based sobre a API nativa do IndexedDB. Esta escolha permite armazenamento local robusto sem necessidade de backend em primeira instância, facilitando o uso offline e garantindo privacidade dos dados sensíveis do paciente.

Para sincronização futura com backend (opcional), a arquitetura será preparada com uma camada de abstração que pode facilmente conectar-se a um backend REST ou GraphQL. O schema do IndexedDB será desenhado de forma a ser facilmente mapeável para estruturas SQL ou NoSQL em backend futuro.

### 2.3 Integração com Google Gemini API

A integração com a API do Gemini 2.5 Pro será utilizada exclusivamente para geração das Matrizes de Raven no módulo de avaliação cognitiva. As chamadas à API serão feitas através de endpoints HTTPS seguros, com implementação de retry logic e error handling robusto para lidar com possíveis falhas de rede ou timeout.

Cada chamada à API do Gemini incluirá um prompt estruturado que especifica detalhadamente as regras de construção de matrizes progressivas, retornando um objeto JSON contendo: o SVG da matriz completa, a resposta correta (index da opção), explicação detalhada da lógica da progressão, e um identificador único para tracking.

## 3. Modelagem de Dados

### 3.1 Entidade: Medicamento (Medication)

Cada medicamento cadastrado no sistema precisa armazenar não apenas informações identificadoras, mas também parâmetros farmacocinéticos essenciais para cálculo de concentrações séricas. A estrutura de dados para medicamentos incluirá:

**Campos Identificadores:**
- id: String (UUID gerado localmente)
- name: String (nome genérico do medicamento, ex: "Escitalopram")
- brandName: String opcional (nome comercial, ex: "Lexapro")
- category: String (classe farmacológica, ex: "SSRI", "Stimulant", "Mood Stabilizer")

**Parâmetros Farmacocinéticos Obrigatórios:**
- halfLife: Number (meia-vida de eliminação em horas) - Crítico para calcular quanto tempo o medicamento permanece no organismo
- volumeOfDistribution: Number (em L/kg) - Necessário para estimar a concentração inicial após uma dose
- bioavailability: Number (0-1, fração decimal) - Representa quanto da dose oral atinge circulação sistêmica
- clearance: Number (em L/h/kg) - Taxa de eliminação do fármaco

**Parâmetros Farmacocinéticos Opcionais (dependem do modelo usado):**
- absorptionRate: Number (constante de absorção Ka, em 1/h) - Para modelos que consideram fase de absorção explicitamente
- peakTime: Number (em horas) - Tempo para atingir concentração plasmática máxima
- compartmentModel: String ("one-compartment" ou "two-compartment") - Define complexidade do cálculo

**Metadados Clínicos:**
- therapeuticRange: Object {min: Number, max: Number, unit: String} - Faixa terapêutica conhecida quando disponível
- notes: String - Notas do usuário sobre o medicamento
- createdAt: Timestamp
- updatedAt: Timestamp

**Justificativa Clínica dos Parâmetros:**

A meia-vida é fundamental porque determina a frequência de dosagem necessária para manter níveis estáveis. Medicamentos com meia-vida curta como lisdexanfetamina (menos de 1 hora para o pró-fármaco) têm picos e vales pronunciados, enquanto medicamentos com meia-vida longa como fluoxetina (4-6 dias incluindo metabólito ativo) mantêm níveis muito mais estáveis.

O volume de distribuição indica quanto o medicamento se distribui pelos tecidos versus permanece no plasma. Medicamentos lipofílicos como muitos psicotrópicos têm volumes grandes, significando que após uma dose, a concentração plasmática inicial será relativamente baixa pois o fármaco se distribui amplamente pelos tecidos, incluindo o SNC onde exerce seu efeito.

### 3.2 Entidade: Dose Administrada (MedicationDose)

Cada registro de administração de medicamento captura o momento exato e quantidade administrada:

{
  id: String (UUID),
  medicationId: String (FK para Medication),
  timestamp: Date/Timestamp (momento exato da administração),
  doseAmount: Number (quantidade em mg),
  route: String ("oral", "sublingual", "transdermal", etc.),
  notes: String (opcional, ex: "tomado com alimento"),
  createdAt: Timestamp,
  // Campos calculados (podem ser computados on-demand ou salvos)
  estimatedPeakTime: Date/Timestamp,
  estimatedPeakConcentration: Number
}
### 3.3 Entidade: Registro de Humor (MoodEntry)

Registros de humor precisam capturar tanto o estado subjetivo quanto metadados temporais precisos:

{
  id: String (UUID),
  timestamp: Date/Timestamp,
  moodScore: Number (escala 0-10, onde 0=pior possível, 10=melhor possível),
  // Dimensões adicionais opcionais para análise mais granular
  anxietyLevel: Number (0-10, opcional),
  energyLevel: Number (0-10, opcional),
  focusLevel: Number (0-10, opcional),
  notes: String (opcional, descrição qualitativa),
  createdAt: Timestamp
}
**Justificativa das Múltiplas Dimensões:**

Embora o moodScore seja a métrica primária, estados psiquiátricos são multidimensionais. Um paciente pode ter humor elevado mas ansiedade alta (comum em estados mistos), ou humor baixo mas boa concentração. Capturar essas dimensões separadamente permite correlações mais nuançadas com perfis farmacocinéticos específicos.

### 3.4 Entidade: Teste Cognitivo (CognitiveTest)

Cada sessão de teste com as Matrizes de Raven gera um registro agregado:

{
  id: String (UUID),
  timestamp: Date/Timestamp (início do teste),
  matrices: Array<{
    matrixId: String, // ID retornado pela API do Gemini
    svgContent: String, // SVG da matriz
    correctAnswer: Number, // Index da resposta correta
    userAnswer: Number, // Index da resposta do usuário
    responseTime: Number, // Tempo em segundos
    wasCorrect: Boolean,
    explanation: String // Explicação da lógica
  }>, // Array sempre com 4 matrizes
  totalScore: Number, // Score final calculado
  averageResponseTime: Number,
  accuracy: Number, // Percentual de acertos (0-1)
  createdAt: Timestamp
}
**Fórmula de Pontuação:**

O score total é calculado como a soma dos scores individuais de cada matriz, onde cada score individual é inversamente proporcional ao tempo de resposta. A fórmula sugerida é:

scoreMatriz = (acertou ? 1 : 0) * (100 / (1 + log(tempoEmSegundos)))
Esta fórmula penaliza tanto erros (score zero) quanto tempos muito longos, mas não penaliza excessivamente diferenças pequenas de tempo, reconhecendo que há variação natural no processamento cognitivo.

## 4. Módulos Funcionais

### 4.1 Módulo Farmacocinético

#### 4.1.1 Modelo Matemático Base

O sistema implementará primariamente um modelo monocompartimental com cinética de primeira ordem, que é adequado para a maioria dos psicotrópicos e representa um bom equilíbrio entre precisão e complexidade computacional.

**Equação Fundamental - Concentração após Dose Única:**

C(t) = (D * F * Ka) / (Vd * (Ka - Ke)) * (e^(-Ke*t) - e^(-Ka*t))
Onde:
- C(t) = Concentração plasmática no tempo t
- D = Dose administrada (mg)
- F = Biodisponibilidade (fração)
- Ka = Constante de absorção (1/h)
- Ke = Constante de eliminação (1/h) = 0.693 / meia-vida
- Vd = Volume de distribuição (L ou L/kg * peso_corporal)
- t = Tempo após administração (h)

**Para Doses Múltiplas (Regime de Manutenção):**

Quando há múltiplas doses ao longo do tempo, aplicamos o princípio de superposição, onde cada dose contribui independentemente para a concentração total:

C_total(t) = Σ C_dose_i(t - t_i)
Para cada dose i administrada no tempo t_i, calculamos sua contribuição no tempo atual t usando a equação de dose única com (t - t_i) como parâmetro temporal.

#### 4.1.2 Considerações para Medicamentos Específicos

**SSRIs (Escitalopram, Fluoxetina, Sertralina):**
- Usar modelo monocompartimental padrão
- Meia-vida: Escitalopram ~30h, Fluoxetina ~4-6 dias (considerando norfluoxetina)
- Importante: considerar tempo até steady-state (~5 meias-vidas)

**Estimulantes (Lisdexanfetamina, Metilfenidato):**
- Lisdexanfetamina requer modelo em duas etapas: conversão do pró-fármaco → dextroanfetamina ativa
- Primeira etapa: hidrólise enzimática (rápida, ~1h)
- Segunda etapa: farmacocinética da dextroanfetamina (meia-vida ~10h)
- Modelo simplificado pode tratar como monocompartimental com Ka alto e T_max curto

**Estabilizadores de Humor (Lamotrigina, Lítio, Valproato):**
- Lamotrigina: meia-vida ~25-30h, volume distribuição moderado
- Lítio: meia-vida ~24h, volume distribuição pequeno (água corporal), requer monitoramento de níveis séricos reais
- Importante: janela terapêutica estreita, faixa tóxica próxima

#### 4.1.3 Implementação Computacional

O cálculo será implementado como uma função pura JavaScript que recebe:
- Array de todas as doses administradas com timestamps
- Objeto do medicamento com parâmetros farmacocinéticos
- Timestamp para o qual queremos calcular a concentração
- Peso corporal do usuário (para ajuste do Vd)

function calculateConcentration(medication, doses, targetTime, bodyWeight) {
  // Implementação que aplica a equação monocompartimental
  // considerando todas as doses anteriores ao targetTime
}
A função retorna um objeto contendo:
- concentration: Number (ng/mL ou μg/mL)
- isAtSteadyState: Boolean (true se passaram >5 meias-vidas)
- timeToSteadyState: Number (horas restantes, se não em steady-state)

#### 4.1.4 Geração de Curvas Temporais

Para plotar gráficos suaves, a função será chamada em intervalos regulares (ex: a cada hora) através de um range temporal definido. A implementação criará um array de pontos de dados:

function generateConcentrationCurve(medication, doses, startTime, endTime, intervalHours = 1) {
  const dataPoints = [];
  let currentTime = startTime;
  
  while (currentTime <= endTime) {
    dataPoints.push({
      timestamp: currentTime,
      concentration: calculateConcentration(medication, doses, currentTime, bodyWeight)
    });
    currentTime += intervalHours * 3600000; // Adiciona intervalo em ms
  }
  
  return dataPoints;
}
### 4.2 Módulo de Mini-Game: Matrizes de Raven

#### 4.2.1 Conceito das Matrizes Progressivas de Raven

As Matrizes Progressivas de Raven são um teste de inteligência não-verbal que avalia raciocínio abstrato e capacidade de identificar padrões. Cada matriz consiste em uma grade 3x3 onde 8 células contêm figuras que seguem um padrão lógico, e a 9ª célula (inferior direita) está vazia. O participante deve identificar qual das opções apresentadas completa logicamente o padrão.

Os padrões podem envolver múltiplas dimensões simultâneas:
- **Progressão Contínua**: elementos que aumentam, diminuem, ou mudam sistematicamente
- **Alternância**: padrões que alternam entre dois ou três estados
- **Adição/Subtração**: elementos que são adicionados ou removidos progressivamente
- **Rotação**: figuras que giram sistematicamente
- **Mudança de Atributo**: cor, tamanho, forma, orientação que mudam seguindo regra
- **Relações Espaciais**: posicionamento relativo de elementos

#### 4.2.2 Prompt Estruturado para API Gemini

Cada chamada à API do Gemini 2.5 Pro seguirá um template de prompt altamente estruturado:

Você é um especialista em psicometria e design de testes cognitivos. Sua tarefa é criar uma Matriz Progressiva de Raven válida e bem construída.

INSTRUÇÕES DETALHADAS:

1. ESTRUTURA DA MATRIZ:
   - Crie uma grade 3x3 (9 células totais)
   - As primeiras 8 células (lidas da esquerda para direita, cima para baixo) contêm figuras que seguem um padrão lógico
   - A 9ª célula (inferior direita) ficará vazia - é onde o usuário deve identificar a resposta

2. REGRAS DE PADRÕES (escolha 1-3 regras simultâneas):
   
   a) Progressão Numérica de Elementos:
      - Exemplo: 1 círculo → 2 círculos → 3 círculos
      - Pode ser crescente ou decrescente
   
   b) Rotação Sistemática:
      - Elementos giram em ângulo fixo (45°, 90°, etc.)
      - Pode ser horário ou anti-horário
   
   c) Mudança de Forma:
      - Elementos mudam forma seguindo sequência (círculo → quadrado → triângulo → círculo...)
      - Pode haver metamorfose gradual
   
   d) Preenchimento/Padrão Interno:
      - Sólido → Listrado → Vazio → Sólido...
      - Padrões internos que mudam sistematicamente
   
   e) Posição Espacial:
      - Elementos se movem em direções específicas
      - Podem seguir trajetórias previsíveis
   
   f) Sobreposição/Camadas:
      - Elementos se sobrepõem seguindo regras
      - Adição ou subtração de camadas

3. NÍVEL DE DIFICULDADE:
   - FÁCIL: 1 regra simples, padrão muito evidente
   - MÉDIO: 2 regras simultâneas, requer atenção
   - DIFÍCIL: 3 regras simultâneas ou regras mais sutis
   
   Para esta matriz, crie nível MÉDIO.

4. FORMATO DE SAÍDA (JSON):
Retorne APENAS um objeto JSON válido com esta estrutura exata:

{
  "matrixSVG": "string contendo SVG completo da matriz 3x3",
  "correctAnswer": número (0-5, index da opção correta),
  "options": [
    "SVG da opção 0",
    "SVG da opção 1",
    "SVG da opção 2",
    "SVG da opção 3",
    "SVG da opção 4",
    "SVG da opção 5"
  ],
  "explanation": "string explicando qual(is) padrão(ões) está(ão) presente(s) e por que a resposta correta completa esse(s) padrão(ões)",
  "difficulty": "medium",
  "patterns": ["lista", "de", "padrões", "aplicados"]
}

5. REQUISITOS TÉCNICOS DO SVG:
   - ViewBox: 0 0 600 600 para a matriz completa
   - ViewBox: 0 0 200 200 para cada opção individual
   - Usar cores distintas mas não excessivamente vibrantes
   - Formas devem ser claras e bem definidas
   - Incluir grid visual sutil delimitando as 9 células
   - Células devem ser 200x200 cada
   - Célula 9 (inferior direita) deve aparecer vazia/cinza

6. OPÇÕES DE RESPOSTA:
   - Criar 6 opções totais
   - 1 opção é a resposta correta (completa o padrão)
   - 5 opções são distratores plausíveis mas incorretos
   - Distratores devem parecer razoáveis mas violar algum aspecto do padrão

IMPORTANTE: Não inclua nenhum texto adicional além do JSON. Não use markdown. Retorne apenas JSON válido puro.
#### 4.2.3 Fluxo de Execução do Mini-Game

**Inicialização:**
1. Usuário clica em "Fazer Teste Cognitivo"
2. Sistema exibe tela de instruções explicando a tarefa
3. Ao clicar "Iniciar", o timer geral do teste começa

**Para Cada Matriz (4 no total):**
1. Sistema faz chamada à API Gemini com o prompt estruturado
2. Durante loading (pode levar 5-10s), exibir animação de "Gerando matriz..."
3. Ao receber resposta, parsear JSON e validar estrutura
4. Renderizar matriz SVG completa na tela
5. Renderizar as 6 opções SVG como botões clicáveis
6. Iniciar timer individual para esta matriz
7. Aguardar seleção do usuário
8. Quando usuário seleciona, parar timer
9. Calcular score individual: (isCorrect ? 1 : 0) * (100 / (1 + Math.log10(timeInSeconds)))
10. Se incorreto, mostrar explicação brevemente
11. Avançar para próxima matriz

**Finalização:**
1. Após 4 matrizes, calcular score total (soma dos individuais)
2. Calcular precisão (% de acertos)
3. Calcular tempo médio de resposta
4. Salvar resultado completo no banco de dados
5. Exibir tela de resultado com estatísticas
6. Opção de ver histórico de testes anteriores

#### 4.2.4 Tratamento de Erros

Implementar robustez para falhas na API Gemini:
- **Timeout**: Se a chamada demorar >30s, abortar e tentar novamente (até 2 retries)
- **Resposta Inválida**: Se JSON não validar, tentar gerar nova matriz
- **Falha Completa**: Se após 3 tentativas não conseguir, permitir ao usuário: pular esta matriz (score zero) ou cancelar teste completo
- **Rate Limiting**: Implementar backoff exponencial se houver erro 429

### 4.3 Módulo de Correlações Estatísticas

#### 4.3.1 Correlação Básica de Pearson

A análise mais fundamental é a correlação de Pearson entre concentração medicamentosa e score de humor em momentos temporais coincidentes ou próximos.

**Algoritmo:**
1. Para cada medicamento ativo no período analisado
2. Criar pares de dados (concentração, humor) onde:
   - Concentração é calculada no timestamp de cada registro de humor
   - Humor é o score registrado
3. Calcular coeficiente de Pearson r:

r = Σ((xi - x̄)(yi - ȳ)) / √(Σ(xi - x̄)² * Σ(yi - ȳ)²)
Onde xi são concentrações, yi são scores de humor, e x̄, ȳ são as médias respectivas.

Calcular p-value para testar significância estatística
Classificar correlação: |r| < 0.3 (fraca), 0.3-0.7 (moderada), >0.7 (forte)
#### 4.3.2 Análise de Defasagem Temporal (Lag Analysis)

Mudanças em concentrações medicamentosas não necessariamente se refletem imediatamente no humor. Pode haver um lag temporal.
