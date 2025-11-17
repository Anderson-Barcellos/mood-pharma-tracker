# 🔍 Análise de Problemas: Registro de Datas e Horários

## 📋 Resumo Executivo

Este documento identifica os problemas potenciais no registro de datas e horários para logs de humor e doses/administrações de medicamentos quando os dados são salvos em um arquivo estático (`app-data.json`) e renderizados a partir dele.

---

## 🚨 Problemas Identificados

### 1. **Problema Crítico: Timezone na Criação de Timestamps**

**Localização**: Múltiplos componentes de criação de doses e mood entries

**Código Problemático**:
```typescript
// src/features/doses/components/DoseLogger.tsx:39
const dateTime = new Date(`${selectedDate}T${selectedTime}`);
const timestamp = dateTime.getTime();
```

**Problema**:
- Quando você cria `new Date("2025-10-29T14:00")`, o JavaScript interpreta isso como **hora local** do navegador
- Se o usuário está em GMT-3 (Brasil), essa string vira `2025-10-29T14:00:00-03:00`
- Se o usuário está em GMT+0 (UTC), a mesma string vira `2025-10-29T14:00:00+00:00`
- **Resultado**: O mesmo horário digitado pelo usuário gera timestamps diferentes dependendo do timezone!

**Impacto**:
- Doses/humor registrados com horários incorretos quando sincronizados entre dispositivos
- Diferenças de algumas horas quando o arquivo é lido em outro timezone
- Dados inconsistentes quando renderizados em diferentes ambientes

**Arquivos Afetados**:
- `src/features/doses/components/DoseLogger.tsx` (linha 39)
- `src/features/doses/components/QuickDoseModal.tsx` (linha 112)
- `src/features/mood/components/QuickMoodLog.tsx` (linha 34)
- `src/features/mood/components/QuickMoodButton.tsx` (linha 95)
- `src/features/mood/components/MoodView.tsx` (linha 123)
- `src/features/doses/components/MedicationDosesView.tsx` (linha 40)

---

### 2. **Falta de Validação de Timestamps no Backend**

**Localização**: `api/save-data.js`

**Problema**:
- A validação atual só verifica se `lastUpdated` é um ISO string válido
- **Não valida** se os timestamps em `doses` e `moodEntries` são válidos
- Timestamps inválidos ou fora de range podem ser salvos silenciosamente

**Código Atual**:
```javascript
// api/save-data.js:32-62
function validateData(data) {
  // ... valida estrutura básica ...
  // ❌ Não valida timestamps individuais!
}
```

**Impacto**:
- Dados corrompidos podem ser salvos no arquivo estático
- Timestamps negativos, muito grandes, ou NaN podem causar crashes ao renderizar

---

### 3. **Inconsistência na Normalização de Timestamps**

**Localização**: `src/core/database/db.ts`

**Problema**:
- As funções `ensureDose()` e `ensureMoodEntry()` têm fallback para `Date.now()` se timestamp não existir
- Mas quando dados são carregados do JSON estático, podem vir com timestamps inválidos que não são normalizados

**Código**:
```typescript
// src/core/database/db.ts:182-207
function ensureDose(record: MedicationDose): MedicationDose {
  const timestamp = record.timestamp ?? Date.now();
  // ❌ Não valida se timestamp é válido!
  return { ...record, timestamp };
}
```

**Impacto**:
- Timestamps inválidos do JSON podem ser inseridos no IndexedDB
- Erros silenciosos ao renderizar gráficos ou listas

---

### 4. **Problema de Parsing ao Carregar do JSON Estático**

**Localização**: `src/core/services/server-data-loader.ts`

**Problema**:
- Quando o JSON é carregado, os timestamps numéricos são preservados corretamente
- Mas não há validação se os valores são números válidos antes de inserir no IndexedDB
- JSON pode ter timestamps como strings (se houver erro de serialização)

**Código**:
```typescript
// src/core/services/server-data-loader.ts:135-137
if (serverData.doses && serverData.doses.length > 0) {
  await db.doses.bulkAdd(serverData.doses);
  // ❌ Não valida timestamps antes de inserir!
}
```

**Impacto**:
- Dados corrompidos podem ser inseridos no banco
- Timestamps podem ser strings ou outros tipos inválidos

---

### 5. **Problema na Serialização do JSON**

**Localização**: `src/core/services/server-data-loader.ts:287-302`

**Problema**:
- A função `exportLocalData()` serializa diretamente os dados do IndexedDB
- JavaScript `JSON.stringify()` preserva números corretamente
- Mas se houver algum erro de tipo, pode gerar `null` ou valores inválidos

**Código**:
```typescript
// src/core/services/server-data-loader.ts:287-302
export async function exportLocalData(): Promise<ServerData> {
  const [medications, doses, moodEntries, cognitiveTests] = await Promise.all([
    db.medications.toArray(),
    db.doses.toArray(),
    db.moodEntries.toArray(),
    db.cognitiveTests.toArray()
  ]);
  
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(), // ✅ OK
    medications,
    doses, // ❌ Pode conter timestamps inválidos
    moodEntries, // ❌ Pode conter timestamps inválidos
    cognitiveTests
  };
}
```

---

## ✅ Soluções Propostas

### Solução 1: Criar Função Utilitária para Parsing de Data/Hora com Timezone Consistente

**Estratégia**: Criar uma função que sempre interprete data/hora como **hora local do usuário**, mas converta para UTC de forma consistente.

**Implementação**:
```typescript
// src/shared/utils/date-helpers.ts
import { parse } from 'date-fns';

/**
 * ### 🕐 parseLocalDateTime
 * Converte uma string de data/hora (formato "YYYY-MM-DDTHH:mm") para timestamp UTC,
 * interpretando a data como hora LOCAL do usuário.
 * 
 * Exemplo: Se usuário está em GMT-3 e digita "2025-10-29T14:00",
 * isso representa 14:00 no horário local, que será convertido para UTC corretamente.
 */
export function parseLocalDateTime(dateStr: string, timeStr: string): number {
  // Constrói string no formato ISO local: "YYYY-MM-DDTHH:mm"
  const localDateTimeStr = `${dateStr}T${timeStr}`;
  
  // Usa date-fns para parse, que respeita o timezone local do sistema
  const localDate = parse(localDateTimeStr, "yyyy-MM-dd'T'HH:mm", new Date());
  
  // Verifica se o parse foi bem-sucedido
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date/time: ${dateStr} ${timeStr}`);
  }
  
  // Retorna timestamp em UTC (milliseconds desde epoch)
  return localDate.getTime();
}

/**
 * ### ✅ validateTimestamp
 * Valida se um timestamp é um número válido e dentro de range razoável.
 */
export function validateTimestamp(ts: unknown): ts is number {
  if (typeof ts !== 'number') return false;
  if (!Number.isFinite(ts)) return false;
  if (ts < 0) return false;
  
  // Timestamp não pode ser muito antigo (antes de 2000) ou muito futuro (depois de 2100)
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2100-01-01').getTime();
  
  return ts >= minTimestamp && ts <= maxTimestamp;
}
```

### Solução 2: Adicionar Validação Robusta no Backend

**Implementação**:
```javascript
// api/save-data.js
function validateTimestamp(ts) {
  if (typeof ts !== 'number') return false;
  if (!Number.isFinite(ts)) return false;
  if (ts < 0) return false;
  
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2100-01-01').getTime();
  
  return ts >= minTimestamp && ts <= maxTimestamp;
}

function validateData(data) {
  // ... validação existente ...
  
  // Valida timestamps em doses
  if (Array.isArray(data.doses)) {
    for (const dose of data.doses) {
      if (!validateTimestamp(dose.timestamp)) {
        return { valid: false, error: `Invalid timestamp in dose ${dose.id}` };
      }
      if (!validateTimestamp(dose.createdAt)) {
        return { valid: false, error: `Invalid createdAt in dose ${dose.id}` };
      }
    }
  }
  
  // Valida timestamps em moodEntries
  if (Array.isArray(data.moodEntries)) {
    for (const entry of data.moodEntries) {
      if (!validateTimestamp(entry.timestamp)) {
        return { valid: false, error: `Invalid timestamp in mood entry ${entry.id}` };
      }
      if (!validateTimestamp(entry.createdAt)) {
        return { valid: false, error: `Invalid createdAt in mood entry ${entry.id}` };
      }
    }
  }
  
  return { valid: true };
}
```

### Solução 3: Normalizar Timestamps ao Carregar do JSON

**Implementação**:
```typescript
// src/core/database/db.ts
function validateTimestamp(ts: unknown): ts is number {
  if (typeof ts !== 'number') return false;
  if (!Number.isFinite(ts)) return false;
  if (ts < 0) return false;
  
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2100-01-01').getTime();
  
  return ts >= minTimestamp && ts <= maxTimestamp;
}

function ensureDose(record: MedicationDose): MedicationDose {
  let timestamp = record.timestamp ?? Date.now();
  
  // Valida e corrige timestamp inválido
  if (!validateTimestamp(timestamp)) {
    console.warn('[DB] Invalid timestamp in dose, using current time:', record.id, timestamp);
    timestamp = Date.now();
  }
  
  let createdAt = record.createdAt ?? timestamp;
  if (!validateTimestamp(createdAt)) {
    createdAt = timestamp;
  }
  
  return {
    id: record.id,
    medicationId: record.medicationId,
    timestamp,
    doseAmount: record.doseAmount,
    route: record.route,
    notes: record.notes,
    createdAt
  };
}

function ensureMoodEntry(record: MoodEntry): MoodEntry {
  let timestamp = record.timestamp ?? Date.now();
  
  if (!validateTimestamp(timestamp)) {
    console.warn('[DB] Invalid timestamp in mood entry, using current time:', record.id, timestamp);
    timestamp = Date.now();
  }
  
  let createdAt = record.createdAt ?? timestamp;
  if (!validateTimestamp(createdAt)) {
    createdAt = timestamp;
  }
  
  return {
    id: record.id,
    timestamp,
    moodScore: record.moodScore,
    anxietyLevel: record.anxietyLevel,
    energyLevel: record.energyLevel,
    focusLevel: record.focusLevel,
    notes: record.notes,
    createdAt
  };
}
```

### Solução 4: Validar ao Sincronizar do Servidor

**Implementação**:
```typescript
// src/core/services/server-data-loader.ts
async function syncWithLocalDB(serverData: ServerData): Promise<void> {
  console.log('[ServerLoader] Starting sync with local DB...');
  
  // Normaliza e valida dados antes de inserir
  const normalizedDoses = (serverData.doses || []).map(ensureDose).filter(Boolean);
  const normalizedMoodEntries = (serverData.moodEntries || []).map(ensureMoodEntry).filter(Boolean);
  
  // Clear existing data
  await db.medications.clear();
  await db.doses.clear();
  await db.moodEntries.clear();
  await db.cognitiveTests.clear();
  
  // Insert validated data
  if (normalizedDoses.length > 0) {
    await db.doses.bulkAdd(normalizedDoses);
    console.log(`[ServerLoader] Synced ${normalizedDoses.length} doses`);
  }
  
  if (normalizedMoodEntries.length > 0) {
    await db.moodEntries.bulkAdd(normalizedMoodEntries);
    console.log(`[ServerLoader] Synced ${normalizedMoodEntries.length} mood entries`);
  }
  
  // ... resto do código ...
}
```

---

## 📝 Checklist de Implementação

- [ ] **Criar função utilitária `parseLocalDateTime()`** em `src/shared/utils/date-helpers.ts`
- [ ] **Criar função utilitária `validateTimestamp()`** em `src/shared/utils/date-helpers.ts`
- [ ] **Atualizar `DoseLogger.tsx`** para usar `parseLocalDateTime()`
- [ ] **Atualizar `QuickDoseModal.tsx`** para usar `parseLocalDateTime()`
- [ ] **Atualizar `QuickMoodLog.tsx`** para usar `parseLocalDateTime()`
- [ ] **Atualizar `QuickMoodButton.tsx`** para usar `parseLocalDateTime()`
- [ ] **Atualizar `MoodView.tsx`** para usar `parseLocalDateTime()`
- [ ] **Atualizar `MedicationDosesView.tsx`** para usar `parseLocalDateTime()`
- [ ] **Adicionar validação em `api/save-data.js`** para timestamps
- [ ] **Atualizar `db.ts`** para validar timestamps em `ensureDose()` e `ensureMoodEntry()`
- [ ] **Atualizar `server-data-loader.ts`** para normalizar dados antes de inserir
- [ ] **Testar sincronização** entre dispositivos com timezones diferentes
- [ ] **Testar carregamento** de arquivo JSON estático com timestamps válidos
- [ ] **Testar carregamento** de arquivo JSON estático com timestamps inválidos (edge cases)

---

## 🎯 Resultado Esperado

Após implementar as soluções:

1. ✅ Timestamps sempre serão interpretados como hora local do usuário
2. ✅ Validação robusta impedirá dados corrompidos de serem salvos
3. ✅ Dados do JSON estático serão normalizados ao carregar
4. ✅ Renderização consistente independente do timezone do dispositivo
5. ✅ Logs de debug ajudarão a identificar problemas futuros

---

## 📚 Referências

- [MDN: Date.parse()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse)
- [date-fns: parse()](https://date-fns.org/docs/parse)
- [JavaScript Date Timezone Gotchas](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#timezone)

---

**Data da Análise**: 2025-10-29  
**Autor**: Análise Automatizada do Código

