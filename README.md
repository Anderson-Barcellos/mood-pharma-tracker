# 🧠💊 Mood & Pharma Tracker - Documentação Completa

**Versão:** 2.0  
**Data:** Outubro 2025  
**Tipo:** Aplicação Web para Monitoramento Terapêutico Pessoal

---

## 📑 Índice

### Parte I: Visão Geral e Arquitetura
1. [Introdução ao Projeto](#1-introdução-ao-projeto)
2. [Objetivos e Propósito Clínico](#2-objetivos-e-propósito-clínico)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)

### Parte II: Modelo de Dados
6. [Schema do Banco de Dados](#6-schema-do-banco-de-dados)
7. [Entidade: Medication](#7-entidade-medication)
8. [Entidade: MedicationDose](#8-entidade-medicationdose)
9. [Entidade: MoodEntry](#9-entidade-moodentry)
10. [Entidade: CognitiveTest](#10-entidade-cognitivetest)

### Parte III: Features e Implementação
11. [Feature: Gerenciamento de Medicamentos](#11-feature-gerenciamento-de-medicamentos)
12. [Feature: Registro de Doses](#12-feature-registro-de-doses)
13. [Feature: Registro de Humor](#13-feature-registro-de-humor)
14. [Feature: Testes Cognitivos](#14-feature-testes-cognitivos)
15. [Feature: Analytics e Correlações](#15-feature-analytics-e-correlações)

### Parte IV: Módulos Core
16. [Módulo Farmacocinético](#16-módulo-farmacocinético)
17. [Módulo Estatístico](#17-módulo-estatístico)
18. [Integração com Gemini API](#18-integração-com-gemini-api)

### Parte V: Guias Práticos
19. [Setup Inicial do Projeto](#19-setup-inicial-do-projeto)
20. [Componentes Compartilhados](#20-componentes-compartilhados)
21. [Configuração do Database](#21-configuração-do-database)
22. [Configuração da Gemini API](#22-configuração-da-gemini-api)

### Parte VI: Dados de Referência
23. [Base de Dados de Medicamentos](#23-base-de-dados-de-medicamentos)
24. [Parâmetros Farmacocinéticos](#24-parâmetros-farmacocinéticos)

### Parte VII: Desenvolvimento
25. [Roadmap de Desenvolvimento](#25-roadmap-de-desenvolvimento)
26. [Checklist Detalhado por Fase](#26-checklist-detalhado-por-fase)
27. [Testes e Qualidade](#27-testes-e-qualidade)

### Parte VIII: Segurança e Deploy
28. [Segurança e Privacidade](#28-segurança-e-privacidade)
29. [Deploy e Produção](#29-deploy-e-produção)

### Apêndices
30. [Referências e Recursos](#30-referências-e-recursos)
31. [FAQ e Troubleshooting](#31-faq-e-troubleshooting)

---

# PARTE I: VISÃO GERAL E ARQUITETURA

---

## 1. Introdução ao Projeto

### 1.1 O Que É

O **Mood & Pharma Tracker** é uma aplicação web pessoal projetada para monitoramento terapêutico individual de pacientes em uso de múltiplos psicotrópicos. Diferente de simples trackers de humor ou lembretes de medicação, este aplicativo correlaciona objetivamente concentrações séricas estimadas de medicamentos com estados emocionais e desempenho cognitivo ao longo do tempo.

### 1.2 Por Que Este Projeto Existe

Na prática clínica neuropsiquiátrica moderna, frequentemente ajustamos doses de medicamentos baseados em relatos subjetivos de melhora ou piora sintomatológica, sem uma compreensão quantitativa precisa de como as concentrações plasmáticas desses fármacos se relacionam com o estado clínico do paciente. Este aplicativo transforma essa relação implícita em dados explícitos e analisáveis.

### 1.3 Para Quem É

- **Uso Pessoal:** Pacientes em uso de psicotrópicos que desejam entender melhor seus tratamentos
- **Auto-monitoramento Clínico:** Profissionais de saúde acompanhando seus próprios tratamentos
- **Uso Educacional:** Estudantes de medicina/farmácia aprendendo sobre farmacocinética

**IMPORTANTE:** Este app NÃO substitui acompanhamento profissional. É uma ferramenta de suporte ao entendimento do próprio tratamento.

### 1.4 O Que Faz (MVP)

✅ **Gerencia medicamentos** com parâmetros farmacocinéticos completos  
✅ **Registra doses** administradas com timestamps precisos  
✅ **Acompanha humor** usando escalas validadas (0-10)  
✅ **Testes cognitivos** com Matrizes de Raven geradas por IA  
✅ **Calcula concentrações séricas** usando modelos matemáticos  
✅ **Analisa correlações** entre níveis medicamentosos e bem-estar  
✅ **Visualiza dados** com gráficos interativos  
✅ **Mantém privacidade** com armazenamento 100% local  

---

## 2. Objetivos e Propósito Clínico

### 2.1 Problema Clínico

**Cenário Típico:**
Um paciente em uso de escitalopram 20mg relata que "não está bem" há uma semana. O médico não tem dados objetivos sobre:
- Concentração sérica atual do medicamento
- Como o humor variou dia a dia
- Se há correlação temporal entre doses e estados emocionais
- Se a função cognitiva foi afetada

**Decisão Clínica:**
Ajustar dose? Trocar medicamento? Aguardar mais tempo? Sem dados, é adivinhação educada.

### 2.2 Solução Proposta

Este app permite que o paciente (ou clínico em auto-monitoramento) tenha:

1. **Dados Quantitativos:** Concentrações estimadas ao longo do tempo
2. **Correlações Temporais:** Quando o humor melhora em relação aos níveis medicamentosos
3. **Padrões Identificáveis:** Janelas terapêuticas ótimas
4. **Histórico Completo:** Para discussão informada com profissional

### 2.3 Valor Terapêutico

**Para o Paciente:**
- Empoderamento e compreensão do próprio tratamento
- Identificação de padrões que afetam bem-estar
- Dados concretos para compartilhar com médico
- Validação de percepções subjetivas com dados objetivos

**Para o Clínico:**
- Ferramenta de monitoramento terapêutico
- Base para ajustes posológicos mais informados
- Identificação de não-aderência ou problemas farmacocinéticos
- Documentação longitudinal do tratamento

### 2.4 Limitações Reconhecidas

⚠️ **Este sistema NÃO:**
- Substitui dosagem sérica real (quando indicada)
- Considera interações medicamentosas complexas
- Modela metabólitos ativos separadamente
- Leva em conta variabilidade genética individual
- Oferece diagnóstico ou recomendações terapêuticas

✅ **Este sistema SERVE para:**
- Estimar tendências de concentração
- Identificar padrões temporais
- Facilitar discussão informada com profissional
- Auto-conhecimento e monitoramento pessoal

---

## 3. Stack Tecnológico

### 3.1 Decisões Técnicas e Justificativas

#### Frontend Framework: React 18+

**Por quê React?**
- Arquitetura componetizada facilita modularização
- Ecossistema robusto de bibliotecas
- Hooks permitem lógica reutilizável
- Performance adequada para o escopo do projeto

**Alternativas Consideradas:**
- Vue.js: Mais simples, mas menos bibliotecas especializadas
- Svelte: Mais rápido, mas comunidade menor
- Vanilla JS: Sem a sobrecarga de framework, mas muito código boilerplate

#### Build Tool: Vite

**Por quê Vite?**
- 10-100x mais rápido que Create React App
- Hot Module Replacement (HMR) instantâneo
- Build otimizado automaticamente
- Configuração mínima necessária

**Vs. Create React App:**
- CRA: Mais conhecido, mas lento e "fat"
- Vite: Moderno, rápido, futuro do build tooling

#### State Management: Context API + useReducer

**Por quê não Redux?**
- Complexidade desnecessária para este escopo
- Context API é suficiente para dados globais
- useReducer para lógica complexa localizada
- Bundle size menor

**Quando considerar Redux:**
- Se o app crescer muito (100+ componentes)
- Se precisar de time-travel debugging
- Se tiver lógica de estado muito complexa

#### Persistência: IndexedDB via Dexie.js

**Por quê IndexedDB?**
- Armazenamento local robusto (sem necessidade de backend)
- Suporta grandes volumes de dados
- Queries eficientes
- Privacidade máxima (dados nunca saem do dispositivo)

**Por quê Dexie.js?**
- API Promise-based moderna (vs. callbacks do IndexedDB nativo)
- Queries reativas (`useLiveQuery`)
- Versionamento e migrações facilitadas
- Type-safe e bem documentado

#### Visualização: Recharts

**Por quê Recharts?**
- API declarativa que se integra naturalmente com React
- Gráficos responsivos nativamente
- Suporte robusto para múltiplas séries de dados
- Composable (fácil criar gráficos complexos)

**Alternativas:**
- Chart.js: Mais features, mas não React-native
- Victory: Similar, mas bundle maior
- D3.js: Mais poderoso, mas curva de aprendizado íngreme

#### Estilização: Tailwind CSS

**Por quê Tailwind?**
- Desenvolvimento rápido com utility classes
- Consistência de design garantida
- Bundle final pequeno (purge de CSS não usado)
- Fácil customização de tema

**Complemento:** CSS Modules para componentes que precisem de estilização muito específica

#### IA: Google Gemini 2.5 Pro

**Por quê Gemini?**
- Capacidade de gerar SVGs complexos
- API gratuita generosa (free tier)
- Qualidade de output para tarefas visuais
- Facilidade de integração

**Uso específico:** Geração de Matrizes de Raven (teste cognitivo)

### 3.2 Stack Completo

```
┌─────────────────────────────────────────┐
│           USER INTERFACE (Browser)      │
├─────────────────────────────────────────┤
│  React 18+ (UI Framework)               │
│  ├─ React Router v6 (Navegação)         │
│  ├─ Tailwind CSS (Estilização)          │
│  ├─ Recharts (Gráficos)                 │
│  └─ Context API (Estado Global)         │
├─────────────────────────────────────────┤
│  Vite (Build Tool & Dev Server)         │
├─────────────────────────────────────────┤
│  Dexie.js (IndexedDB Wrapper)           │
│  └─ IndexedDB (Persistência Local)      │
├─────────────────────────────────────────┤
│  Google Gemini API (Geração de IA)      │
│  └─ Somente para Matrizes de Raven      │
└─────────────────────────────────────────┘
```

### 3.3 Dependências

**Produção:**
```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^6.22.0",
  "dexie": "^4.0.0",
  "dexie-react-hooks": "^1.1.7",
  "recharts": "^2.12.0",
  "date-fns": "^3.3.0",
  "uuid": "^9.0.1"
}
```

**Desenvolvimento:**
```json
{
  "@vitejs/plugin-react": "^4.2.1",
  "tailwindcss": "^3.4.1",
  "autoprefixer": "^10.4.17",
  "postcss": "^8.4.35",
  "eslint": "^8.56.0",
  "prettier": "^3.2.5"
}
```

---

## 4. Arquitetura do Sistema

### 4.1 Arquitetura Feature-Based

Diferente da organização tradicional por tipo de arquivo (components/, utils/, etc.), este projeto usa **arquitetura feature-based** onde cada funcionalidade vive em seu próprio módulo auto-contido.

**Vantagens:**
- ✅ Código relacionado vive junto (cohesão)
- ✅ Fácil encontrar e modificar features específicas
- ✅ Escalável (adicionar nova feature não afeta outras)
- ✅ Facilita trabalho em equipe (cada dev pode pegar uma feature)

**Exemplo de Feature:**
```
features/medications/
├── components/          # UI específica desta feature
│   ├── MedicationList.jsx
│   ├── MedicationCard.jsx
│   └── MedicationForm.jsx
├── hooks/              # Lógica reutilizável
│   └── useMedications.js
├── utils/              # Helpers específicos
│   └── validators.js
└── MedicationsPage.jsx # Página principal
```

### 4.2 Fluxo de Dados

```
┌──────────────┐
│  User Input  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Component   │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Custom Hook │ ← Lógica de negócio
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Dexie.js   │ ← Camada de persistência
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  IndexedDB   │ ← Armazenamento
└──────────────┘
```

### 4.3 Camadas do Sistema

#### **Camada de Apresentação (UI)**
- Componentes React
- Gerenciamento de estado local (useState, useReducer)
- Feedback visual e interação

#### **Camada de Lógica de Negócio**
- Custom hooks (useMedications, useDoses, etc.)
- Validações
- Transformações de dados

#### **Camada de Dados**
- Dexie.js para queries
- IndexedDB para persistência
- Schema versionado

#### **Camada de Serviços Externos**
- Gemini API (somente para IA)
- Sem backend próprio

#### **Camada de Cálculos**
- Módulo farmacocinético
- Módulo estatístico
- Puros (sem side effects)

### 4.4 Padrões de Design

#### **Composição de Componentes**
```jsx
// Componente pequeno e focado
<Card>
  <CardHeader title="Medicamentos" />
  <CardBody>
    <MedicationList medications={meds} />
  </CardBody>
</Card>
```

#### **Custom Hooks para Lógica Reutilizável**
```javascript
function useMedications() {
  const [medications, setMedications] = useState([]);
  
  const addMedication = async (data) => { /* ... */ };
  const updateMedication = async (id, updates) => { /* ... */ };
  
  return { medications, addMedication, updateMedication };
}
```

#### **Separação de Concerns**
- Componentes cuidam apenas de UI
- Hooks cuidam de lógica e estado
- Utils cuidam de transformações puras
- Services cuidam de integrações externas

---

## 5. Estrutura de Pastas

### 5.1 Estrutura Completa

```
mood-pharma-tracker/
├── public/
│   └── favicon.ico
├── src/
│   ├── features/                    # Features organizadas por funcionalidade
│   │   ├── medications/
│   │   │   ├── components/
│   │   │   │   ├── MedicationList.jsx
│   │   │   │   ├── MedicationCard.jsx
│   │   │   │   └── MedicationForm.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useMedications.js
│   │   │   ├── utils/
│   │   │   │   └── validators.js
│   │   │   └── MedicationsPage.jsx
│   │   │
│   │   ├── doses/
│   │   │   ├── components/
│   │   │   │   ├── DoseForm.jsx
│   │   │   │   ├── DoseHistory.jsx
│   │   │   │   └── DoseCalendar.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useDoses.js
│   │   │   └── DosesPage.jsx
│   │   │
│   │   ├── mood/
│   │   │   ├── components/
│   │   │   │   ├── MoodSlider.jsx
│   │   │   │   ├── MoodChart.jsx
│   │   │   │   └── MoodHistory.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useMoodEntries.js
│   │   │   └── MoodPage.jsx
│   │   │
│   │   ├── cognitive/
│   │   │   ├── components/
│   │   │   │   ├── MatrixGame.jsx
│   │   │   │   ├── MatrixDisplay.jsx
│   │   │   │   ├── OptionsGrid.jsx
│   │   │   │   ├── TestResults.jsx
│   │   │   │   └── TestHistory.jsx
│   │   │   ├── hooks/
│   │   │   │   └── useCognitiveTests.js
│   │   │   ├── services/
│   │   │   │   ├── geminiService.js
│   │   │   │   ├── promptBuilder.js
│   │   │   │   └── matrixParser.js
│   │   │   └── CognitivePage.jsx
│   │   │
│   │   └── analytics/
│   │       ├── components/
│   │       │   ├── CorrelationChart.jsx
│   │       │   ├── TimelineView.jsx
│   │       │   └── StatsSummary.jsx
│   │       ├── hooks/
│   │       │   └── useAnalytics.js
│   │       ├── utils/
│   │       │   └── dataPreparation.js
│   │       └── AnalyticsPage.jsx
│   │
│   ├── shared/                      # Código compartilhado entre features
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── ErrorDisplay.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Icons.jsx
│   │   ├── hooks/
│   │   │   ├── useLocalStorage.js
│   │   │   ├── useAsync.js
│   │   │   └── useDebounce.js
│   │   ├── utils/
│   │   │   ├── validators.js
│   │   │   ├── formatters.js
│   │   │   └── sanitizers.js
│   │   └── constants/
│   │       ├── config.js
│   │       └── categories.js
│   │
│   ├── core/                        # Lógica de negócio core
│   │   ├── database/
│   │   │   ├── db.js               # Schema Dexie
│   │   │   └── migrations.js       # Migrações futuras
│   │   ├── pharmacokinetics/
│   │   │   ├── calculations.js     # Modelos farmacocinéticos
│   │   │   └── constants.js        # Constantes farmaco
│   │   └── statistics/
│   │       └── correlations.js     # Análises estatísticas
│   │
│   ├── contexts/                    # Context API
│   │   ├── AppContext.jsx
│   │   └── ThemeContext.jsx
│   │
│   ├── App.jsx                      # Componente raiz
│   ├── main.jsx                     # Entry point
│   └── index.css                    # Estilos globais
│
├── .env                             # Variáveis de ambiente (não commitar!)
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── eslint.config.js
└── README.md
```

### 5.2 Convenções de Nomenclatura

**Arquivos de Componentes:** PascalCase
```
MedicationCard.jsx
DoseHistory.jsx
```

**Hooks:** camelCase com prefixo "use"
```
useMedications.js
useDoses.js
```

**Utils e Services:** camelCase
```
validators.js
geminiService.js
```

**Páginas:** PascalCase com sufixo "Page"
```
MedicationsPage.jsx
AnalyticsPage.jsx
```

### 5.3 Importações

**Ordem de Imports:**
```javascript
// 1. Bibliotecas externas
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Core/Database
import { db } from '../../core/database/db';

// 3. Shared/Components
import Button from '../../shared/components/Button';
import Input from '../../shared/components/Input';

// 4. Feature-specific
import { useMedications } from './hooks/useMedications';

// 5. Estilos (se aplicável)
import './MedicationsPage.css';
```

**Imports Absolutos (Opcional):**
```javascript
// Configurar em vite.config.js ou jsconfig.json
import Button from '@/shared/components/Button';
import { db } from '@/core/database/db';
```

---

# PARTE II: MODELO DE DADOS

---

## 6. Schema do Banco de Dados

### 6.1 Visão Geral do IndexedDB

O IndexedDB é um banco de dados NoSQL no browser que permite:
- Armazenar grandes quantidades de dados estruturados
- Queries eficientes com índices
- Transações ACID
- Persistência entre sessões

### 6.2 Schema Dexie.js (Versão 1)

```javascript
// src/core/database/db.js
import Dexie from 'dexie';

export const db = new Dexie('MoodPharmaTrackerDB');

// Versão 1 do schema
db.version(1).stores({
  // Medicamentos cadastrados
  medications: 'id, name, category, createdAt',
  
  // Doses administradas
  doses: 'id, medicationId, timestamp, createdAt',
  
  // Registros de humor
  moodEntries: 'id, timestamp, createdAt',
  
  // Testes cognitivos
  cognitiveTests: 'id, timestamp, createdAt',
  
  // Configurações do usuário
  userSettings: 'key'
});

export default db;
```

### 6.3 Entendendo os Índices

**Primary Key:** Sempre primeiro campo
```javascript
medications: 'id, name, category, createdAt'
//           ^^^ Primary key (unique)
```

**Índices Secundários:** Outros campos permitem queries rápidas
```javascript
doses: 'id, medicationId, timestamp, createdAt'
//          ^^^^^^^^^^^^  ^^^^^^^^^  ^^^^^^^^^^
//          Buscar por    Buscar por  Buscar por
//          medicamento   data        criação
```

### 6.4 Queries Usando Índices

```javascript
// Buscar doses de um medicamento específico
db.doses.where('medicationId').equals(medId).toArray();

// Buscar doses em um período
db.doses.where('timestamp').between(startDate, endDate).toArray();

// Buscar medicamentos por categoria
db.medications.where('category').equals('SSRI').toArray();

// Ordenar por data
db.moodEntries.orderBy('timestamp').reverse().toArray();
```

### 6.5 Migrações Futuras

```javascript
// Versão 2 - adicionar novo campo
db.version(2).stores({
  medications: 'id, name, category, createdAt',
  doses: 'id, medicationId, timestamp, createdAt',
  moodEntries: 'id, timestamp, createdAt',
  cognitiveTests: 'id, timestamp, createdAt',
  userSettings: 'key',
  // Nova tabela
  notifications: 'id, timestamp, type'
}).upgrade(tx => {
  // Código de migração se necessário
  return tx.medications.toCollection().modify(med => {
    med.newField = 'default value';
  });
});
```

---

## 7. Entidade: Medication

### 7.1 Estrutura Completa

```javascript
/**
 * @typedef {Object} Medication
 * 
 * Identificação:
 * @property {string} id - UUID único (gerado com uuid v4)
 * @property {string} name - Nome genérico do medicamento
 * @property {string} [brandName] - Nome comercial opcional
 * @property {string} category - Classe farmacológica
 * 
 * Parâmetros Farmacocinéticos Obrigatórios:
 * @property {number} halfLife - Meia-vida de eliminação (horas)
 * @property {number} volumeOfDistribution - Vd em L/kg
 * @property {number} bioavailability - Biodisponibilidade (0-1)
 * 
 * Parâmetros Farmacocinéticos Opcionais:
 * @property {number} [absorptionRate] - Ka em 1/h (default: 1.0)
 * @property {string} [compartmentModel] - 'one' ou 