# 📝 Changelog - Mood Pharma Tracker

## [1.1.0] - 26/11/2025

### 🎯 Major Refactoring

#### TypeScript & Build
- ✅ **Reduced TypeScript errors from 98 to 7** (-93%)
  - Installed missing type definitions (`@types/node`, `@types/uuid`, `@types/d3`, `@types/three`)
  - Fixed type incompatibilities in health data components
  - Standardized `HeartRateRecord` interface across codebase
- ✅ **Build process fixed and optimized**
  - Removed dependency on `tw-animate-css` (not installed)
  - Build time: ~17.55s
  - Bundle size: 733KB (206KB gzip)
  - All chunks properly split and optimized

#### Dependencies Cleanup
- ❌ Removed 17 unused packages:
  - `@heroicons/react`, `@octokit/core`, `marked`, `tw-animate-css`
  - `@tailwindcss/container-queries`, `@tailwindcss/postcss`, `tailwindcss`
- ✅ Fixed 2 security vulnerabilities (`body-parser`, `js-yaml`)
- **Result:** 497 → 480 packages (-17)

#### Code Quality Improvements
- ✅ **Created shared CSV parser utility** (`/src/features/health-data/utils/csv-parser.ts`)
  - Eliminated 4 duplicate CSV parsing implementations
  - Robust validation (HR range: 30-220 bpm)
  - Automatic context inference (sleep/exercise/stress/resting)
  - Error handling and deduplication
- ✅ **Removed duplicate hooks**
  - Consolidated `useIsMobile` to `/src/shared/hooks/`
  - Removed duplicate from `/src/hooks/`
- ✅ **Fixed type inconsistencies**
  - `HeartRateRecord` now extends `BaseHealthRecord`
  - Proper optional field handling (`??` operator)
  - Removed invalid 'recovery' context
  - Fixed GlassCard variant: "flat" → "default"

### ✨ New Features

#### Advanced Correlations Integration
- ✅ **Integrated `AdvancedCorrelationsView` into Dashboard**
  - New "Correlações" tab with Heart icon
  - Grid layout: 4 tabs (Visão Geral | Insights | **Correlações** | Progresso)
  - Features:
    - Heart rate ↔ Medications correlation analysis
    - Heart rate ↔ Mood correlation analysis
    - Statistical significance testing
    - CSV upload from Samsung Health
    - Automatic HEALTH_DATA/ folder processing
    - Timeframe selector (24h, 7d, 30d, 90d)
    - Real-time processing status

#### Health Data Processing
- ✅ **Standardized heart rate context classification**
  ```typescript
  // Sleep: 22:00-06:00 && HR < 70
  // Exercise: HR > 120
  // Stress: HR > 100 || HR < 50
  // Resting: default
  ```
- ✅ **Improved CSV parsing robustness**
  - Date validation (2000-2100, valid months/days)
  - NaN checks on parsed values
  - Proper whitespace handling

### 📚 Documentation
- ✅ **Created comprehensive refactoring documentation**
  - `REFACTORING_2025-11-26.md` - Full refactoring report
  - `CLAUDE.md` - Project conventions and guidelines
  - Updated `CHANGELOG.md` (this file)

### 🐛 Bug Fixes
- ✅ Fixed `renderDot` in `HeartRateCorrelationChart` (returns `<></>` instead of `null`)
- ✅ Fixed undefined handling in correlation calculations
- ✅ Fixed health-database Promise array typing
- ✅ Fixed date range typing in health stats
- ✅ Removed Activity icon import (doesn't exist in phosphor-icons)

### ⏳ Known Issues
- ⚠️ 7 remaining TypeScript errors (all in test/script files, non-critical)
  - `SimpleTestDataGenerator.tsx` (4 errors)
  - `seed-test-data.ts` (1 error - deleted module import)
  - Others in less critical files
- 🔧 **Pending improvements:**
  - Implement temporal lag analysis (tab exists but empty)
  - Remove 120+ console.log statements
  - Migrate hardcoded URLs to environment variables
  - Fix timer cleanup (potential memory leaks)
  - Create `/api/list-health-files` endpoint

### 📊 Performance Metrics
- **TypeScript errors:** 98 → 7 (93% reduction)
- **Build time:** ~17.55s
- **Bundle analysis:**
  - index.html: 6.83 KB (2.04 KB gzip)
  - CSS: 605.89 KB (96.34 KB gzip)
  - vendor-charts: 415.18 KB (111.97 KB gzip)
  - index.js: 733.29 KB (205.94 KB gzip)
- **Dependencies:** 497 → 480 packages

### 🔧 Technical Details
- **5 parallel agents** used for initial analysis
- **Execution time:** ~2 hours
- **Files modified:** 20+
- **Files created:** 2 (csv-parser.ts, documentation)
- **Lines of code changed:** ~500+

---

## [1.0.0] - 03/11/2025

### ✨ Implementado

#### Sincronização de Dados
- ✅ Adicionado `scheduleServerSync` aos testes cognitivos
- ✅ Todas as entidades agora sincronizam: doses, mood, cognitive tests
- ✅ Sistema robusto de persistência no servidor

#### Testes Cognitivos (Nova Implementação)
- ✅ Endpoint backend `/api/generate-matrix` (Gemini 2.5 Pro server-side)
- ✅ API key segura no servidor (variável ambiente)
- ✅ `CognitiveBasicView.tsx` - Interface simplificada
- ✅ `serverMatrixService.ts` - Cliente HTTP com retry logic
- ✅ Configuração de prompts migrada do protótipo
- ✅ Fluxo linear: 4 matrizes sequenciais
- ✅ Feedback imediato e analytics

### 🧹 Limpeza de Código

#### Arquivos Removidos (movidos para `archive/`)
- ❌ `CognitiveView.tsx` (554 linhas) - Implementação complexa antiga
- ❌ `geminiService.ts` (437 linhas) - Gemini frontend (inseguro)
- ❌ `src/dev/cognitive-standalone/` - Ambiente de desenvolvimento

#### Benefícios
- **Redução**: ~1000+ linhas de código não usado
- **Build**: 13.3s (otimizado)
- **Bundle size**: 608KB (index.js) + 415KB (charts)
- **Manutenibilidade**: Muito melhorada
- **Segurança**: API key não exposta

### 📚 Documentação
- ✅ `DEPLOYMENT.md` - Guia completo de configuração
- ✅ `VALIDATION.md` - Testes e validação
- ✅ `archive/cognitive-old/README.md` - Arquivos arquivados

### 🛠️ Configuração

#### Backend
- Porta 3001: API de salvamento (`/api/save-data`)
- Porta 3002: Gerador de matrizes (`/api/generate-matrix`)
- Variável: `GEMINI_API_KEY` configurada

#### Frontend
- Porta 8112: Vite dev server
- Proxy: Configurado para ambos os backends
- HMR: Ativo para desenvolvimento

### 📊 Estatísticas

```
Registros Atuais:
├── Medicações: 4
├── Doses: 5
├── Mood Entries: 1
└── Cognitive Tests: 0 (pronto para uso)

Código Arquivado:
├── Tamanho: 160KB
└── Localização: archive/cognitive-old/

Código Atual:
└── Tamanho: 120KB (25% menor)
```

### 🎯 Sistema Funcionando

**Core Features:**
- ✅ Cadastro de medicações
- ✅ Registro de doses
- ✅ Tracking de humor
- ✅ Analytics e correlações
- ✅ Testes cognitivos (via servidor)
- ✅ Sincronização automática
- ✅ PWA funcional

---

## Próximas Melhorias (Futuro)

- [ ] Testes automatizados
- [ ] Cache de matrizes no cliente
- [ ] Rate limiting no backend
- [ ] CI/CD pipeline
- [ ] Logs estruturados
- [ ] Ajuste de timezone para Brasil

---

**Versão**: 1.0.0
**Status**: ✅ Estável e Funcional
**Autor**: Anders Barcellos
**Data**: 03 de Novembro de 2025



