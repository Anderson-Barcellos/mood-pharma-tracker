# Fluxogramas do Sistema de Dados

Este documento apresenta os fluxogramas detalhados dos processos de armazenamento e resgate de dados no **Mood & Pharma Tracker**.

---

## Índice

1. [Fluxo Geral do Sistema](#fluxo-geral-do-sistema)
2. [Fluxo de Armazenamento - Medicamentos](#fluxo-de-armazenamento---medicamentos)
3. [Fluxo de Armazenamento - Doses](#fluxo-de-armazenamento---doses)
4. [Fluxo de Armazenamento - Humor](#fluxo-de-armazenamento---humor)
5. [Fluxo de Leitura com useLiveQuery](#fluxo-de-leitura-com-uselivequery)
6. [Fluxo de Sincronização - Salvar no Servidor](#fluxo-de-sincronização---salvar-no-servidor)
7. [Fluxo de Sincronização - Carregar do Servidor](#fluxo-de-sincronização---carregar-do-servidor)
8. [Fluxo de Migração de Dados Legados](#fluxo-de-migração-de-dados-legados)
9. [Fluxo de Invalidação de Cache](#fluxo-de-invalidação-de-cache)

---

## Fluxo Geral do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA DO SISTEMA                       │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   Componentes    │         │   API Backend    │
│      React       │         │   (Express.js)   │
│                  │         │                  │
│  - DoseLogger    │         │  - POST /api/    │
│  - MoodView      │         │    save-data     │
│  - Medications   │         │  - Validação     │
└────────┬─────────┘         └────────▲─────────┘
         │                            │
         │ useMedications()           │ HTTP POST/GET
         │ useDoses()                 │ (JSON)
         │ useMoodEntries()           │
         │                            │
         ▼                            │
┌─────────────────────────────────────┴─────────┐
│          React Hooks (Custom)                 │
│                                               │
│  - use-medications.ts                         │
│  - use-doses.ts                               │
│  - use-mood-entries.ts                        │
│  - use-doses-range.ts                         │
└────────┬──────────────────────────────────────┘
         │
         │ useLiveQuery() - Reatividade
         │ CRUD operations
         │
         ▼
┌─────────────────────────────────────────────────┐
│              Dexie.js (ORM)                     │
│                                                 │
│  db.medications   db.doses   db.moodEntries    │
│       .put()      .put()          .put()        │
│       .get()      .get()          .get()        │
│       .delete()   .delete()       .delete()     │
│       .where()    .where()        .where()      │
└────────┬────────────────────────────────────────┘
         │
         │ Transações e Queries SQL-like
         │
         ▼
┌─────────────────────────────────────────────────┐
│        IndexedDB (Browser Storage)              │
│                                                 │
│  Database: MoodPharmaTrackerDB                  │
│  Version: 3                                     │
│                                                 │
│  Tables:                                        │
│  - medications (id, name, category, ...)        │
│  - doses (id, medicationId, timestamp, ...)     │
│  - moodEntries (id, timestamp, moodScore, ...)  │
│  - cognitiveTests (id, timestamp, ...)          │
│  - metadata (key, value, updatedAt)             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         Camadas de Cache                        │
│                                                 │
│  1. React Query Cache (5 min TTL)               │
│  2. LRU Cache Farmacocinético (5 min TTL)       │
│  3. useLiveQuery() - Reatividade automática     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│         Sincronização com Servidor              │
│                                                 │
│  ┌──────────────────────────────────────┐       │
│  │  server-sync.ts (Debounce 1.5s)     │       │
│  │  - scheduleServerSync()              │       │
│  └──────────────────────────────────────┘       │
│                    │                            │
│                    ▼                            │
│  ┌──────────────────────────────────────┐       │
│  │  server-data-loader.ts               │       │
│  │  - loadServerData()                  │       │
│  │  - saveToServer()                    │       │
│  │  - exportLocalData()                 │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

## Fluxo de Armazenamento - Medicamentos

### Criar Medicamento

```
┌─────────────────────────────────────────────────────────┐
│ USUÁRIO: Preenche formulário "Adicionar Medicamento"   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │ MedicationsView.tsx           │
        │ - onSubmit()                  │
        │ - Valida campos obrigatórios  │
        └───────────┬───────────────────┘
                    │ createMedication(payload)
                    ▼
        ┌───────────────────────────────┐
        │ use-medications.ts            │
        │ Hook: useMedications()        │
        └───────────┬───────────────────┘
                    │
                    ├─► createMedicationRecord(payload)
                    │   │
                    │   ├─► Gera UUID
                    │   ├─► Define createdAt = Date.now()
                    │   ├─► Define updatedAt = Date.now()
                    │   ├─► Aplica valores padrão
                    │   └─► Retorna: Medication completo
                    │
                    ▼
        ┌───────────────────────────────┐
        │ db.medications.put(record)    │
        │ (Dexie/IndexedDB)             │
        └───────────┬───────────────────┘
                    │
                    ├─► IndexedDB Transaction (readwrite)
                    │   │
                    │   ├─► Validação de schema
                    │   ├─► Verifica índices
                    │   └─► Commit
                    │
                    ├─► ✅ Salvo com sucesso
                    │
                    └─► Dispara evento de mudança
                        │
                        ▼
        ┌───────────────────────────────┐
        │ scheduleServerSync(           │
        │   'medication:create'         │
        │ )                             │
        └───────────┬───────────────────┘
                    │
                    ├─► Timer de debounce: 1500ms
                    │   (Reseta se houver nova operação)
                    │
                    ▼ (após 1.5s de inatividade)
        ┌───────────────────────────────┐
        │ exportLocalData()             │
        │ - Exporta todas as tabelas    │
        │ - Gera JSON completo          │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │ POST /api/save-data           │
        │ - Envia JSON ao servidor      │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │ Backend: save-data.js         │
        │                               │
        │ 1. Valida estrutura           │
        │ 2. Valida timestamps          │
        │ 3. Compara com snapshot       │
        │    existente                  │
        │ 4. Cria backup automático     │
        │ 5. Salva app-data.json        │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │ ✅ 200 OK                      │
        │ - Retorna stats               │
        │ - Atualiza sync timestamp     │
        └───────────┬───────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │ useLiveQuery() detecta mudança│
        │ - UI atualiza automaticamente │
        │ - Lista de medicamentos       │
        │   recarrega                   │
        └───────────────────────────────┘
```

### Atualizar Medicamento

```
USUÁRIO: Edita medicamento
    │
    ▼
┌─────────────────────────────┐
│ updateMedication(id, updates)│
└───────────┬─────────────────┘
            │
            ├─► db.medications.get(id)
            │   └─► Busca registro existente
            │
            ├─► mergeMedicationRecord(existing, updates)
            │   │
            │   ├─► Preserva campos existentes
            │   ├─► Aplica atualizações
            │   ├─► updatedAt = Date.now()
            │   └─► Retorna: Medication atualizado
            │
            ▼
┌─────────────────────────────┐
│ db.medications.put(merged)  │
└───────────┬─────────────────┘
            │
            ├─► Sobrescreve registro
            │
            ▼
┌─────────────────────────────┐
│ scheduleServerSync(         │
│   'medication:update'       │
│ )                           │
└─────────────────────────────┘
            │
            └─► [Mesmo fluxo de sync]
```

### Deletar Medicamento

```
USUÁRIO: Confirma exclusão
    │
    ▼
┌─────────────────────────────┐
│ deleteMedication(id)        │
└───────────┬─────────────────┘
            │
            ▼
┌──────────────────────────────────────┐
│ db.transaction('rw',                 │
│   db.medications,                    │
│   db.doses                           │
│ )                                    │
└───────────┬──────────────────────────┘
            │ TRANSAÇÃO ATÔMICA
            │
            ├─► db.medications.delete(id)
            │   └─► Remove medicamento
            │
            ├─► db.doses
            │     .where('medicationId')
            │     .equals(id)
            │     .delete()
            │   └─► Remove TODAS as doses
            │
            ▼
┌─────────────────────────────┐
│ ✅ Commit da transação       │
│ (ou rollback se erro)       │
└───────────┬─────────────────┘
            │
            ▼
┌─────────────────────────────┐
│ scheduleServerSync(         │
│   'medication:delete'       │
│ )                           │
└─────────────────────────────┘
```

---

## Fluxo de Armazenamento - Doses

### Criar Dose

```
USUÁRIO: Registra dose (QuickDoseModal ou DoseLogger)
    │
    ▼
┌─────────────────────────────┐
│ use-doses.ts                │
│ createDose(payload)         │
└───────────┬─────────────────┘
            │
            ├─► Gera UUID
            │   id = uuid()
            │
            ├─► Define timestamps
            │   timestamp = payload.timestamp ?? Date.now()
            │   createdAt = payload.createdAt ?? Date.now()
            │
            ├─► Constrói MedicationDose
            │   {
            │     id, medicationId, timestamp,
            │     doseAmount, route, notes, createdAt
            │   }
            │
            ▼
┌─────────────────────────────┐
│ db.doses.put(record)        │
└───────────┬─────────────────┘
            │
            ├─► Salva no IndexedDB
            │   - Índice [medicationId+timestamp]
            │   - Índice timestamp
            │   - Índice medicationId
            │
            ▼
┌─────────────────────────────┐
│ invalidateCache(medicationId)│
└───────────┬─────────────────┘
            │
            ├─► pkCache.invalidate(medicationId)
            │   └─► Limpa cache farmacocinético
            │       (cálculos de concentração)
            │
            ├─► queryClient.invalidateQueries(
            │     ['concentration-curve', medicationId]
            │   )
            │   └─► Invalida queries React Query
            │
            ├─► queryClient.invalidateQueries(
            │     ['concentration-point', medicationId]
            │   )
            │
            ▼
┌─────────────────────────────┐
│ scheduleServerSync(         │
│   'dose:create'             │
│ )                           │
└─────────────────────────────┘
            │
            └─► [Fluxo de sincronização]
```

### Implicações da Invalidação de Cache

```
pkCache.invalidate(medicationId)
    │
    ├─► Remove entradas do LRU Cache
    │   relacionadas ao medicamento
    │
    └─► Próximos cálculos farmacocinéticos
        serão recalculados com as novas doses
        │
        ▼
┌─────────────────────────────────────┐
│ Gráficos de Concentração            │
│ (AnalyticsDashboard)                │
│                                     │
│ - Curva de concentração plasmática  │
│ - Níveis terapêuticos               │
│ - Correlação medicamento-humor      │
│                                     │
│ ATUALIZADOS automaticamente         │
└─────────────────────────────────────┘
```

---

## Fluxo de Armazenamento - Humor

### Criar Registro de Humor

```
USUÁRIO: Registra humor (QuickMoodLog ou MoodView)
    │
    ▼
┌─────────────────────────────┐
│ use-mood-entries.ts         │
│ createMoodEntry(payload)    │
└───────────┬─────────────────┘
            │
            ├─► Gera UUID
            │   id = uuid()
            │
            ├─► Define timestamp
            │   timestamp = payload.timestamp ?? Date.now()
            │   createdAt = payload.createdAt ?? timestamp
            │
            ├─► Constrói MoodEntry
            │   {
            │     id, timestamp, createdAt,
            │     moodScore,         // 0-10
            │     anxietyLevel,      // 0-10
            │     energyLevel,       // 0-10
            │     focusLevel,        // 0-10
            │     sensitivityLevel,  // 0-10
            │     motivationLevel,   // 0-10
            │     notes
            │   }
            │
            ▼
┌─────────────────────────────┐
│ db.moodEntries.put(record)  │
└───────────┬─────────────────┘
            │
            ├─► Salva no IndexedDB
            │   - Índice timestamp
            │   - Índice moodScore
            │   - Índice createdAt
            │
            ▼
┌─────────────────────────────┐
│ scheduleServerSync(         │
│   'mood:create'             │
│ )                           │
└─────────────────────────────┘
            │
            └─► [Fluxo de sincronização]
            
┌─────────────────────────────┐
│ useLiveQuery() reage        │
│                             │
│ Componentes atualizados:    │
│ - MoodHistory               │
│ - MoodTrends                │
│ - AnalyticsDashboard        │
│   (correlações med-humor)   │
└─────────────────────────────┘
```

---

## Fluxo de Leitura com useLiveQuery

### Como useLiveQuery Funciona

```
┌─────────────────────────────────────────────────┐
│ Componente React renderiza                     │
│                                                │
│ const { medications } = useMedications();      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ use-medications.ts                              │
│                                                 │
│ const queryResult = useLiveQuery(               │
│   async () => {                                 │
│     const records = await db.medications        │
│       .orderBy('createdAt')                     │
│       .reverse()                                │
│       .toArray();                               │
│     return records ?? [];                       │
│   },                                            │
│   []  // dependencies                           │
│ );                                              │
└────────────────┬────────────────────────────────┘
                 │
                 ├─► [1ª Execução]
                 │   │
                 │   ├─► Query executa
                 │   ├─► Retorna dados iniciais
                 │   └─► Componente renderiza
                 │
                 ├─► [Dexie Observability]
                 │   │
                 │   ├─► Dexie monitora tabela
                 │   │   'medications'
                 │   │
                 │   ├─► QUALQUER mudança detectada:
                 │   │   - .put()
                 │   │   - .delete()
                 │   │   - .update()
                 │   │
                 │   └─► Dispara re-execução da query
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ Query re-executa automaticamente                │
│                                                 │
│ - Busca dados atualizados                       │
│ - Retorna novo array                            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│ React detecta mudança no estado                 │
│ - Componente re-renderiza                       │
│ - UI atualiza sem reload                        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ VANTAGENS:                                      │
│                                                 │
│ ✅ UI sempre sincronizada com banco             │
│ ✅ Sem necessidade de callbacks complexos       │
│ ✅ Sem gerenciamento manual de estado           │
│ ✅ Múltiplos componentes atualizam juntos       │
│ ✅ Funciona através de tabs/windows             │
└──────────────────────────────────────────────────┘
```

### Exemplo: Múltiplos Componentes Reativos

```
                [Usuário adiciona dose]
                         │
                         ▼
            ┌─────────────────────────┐
            │ db.doses.put(newDose)   │
            └───────────┬─────────────┘
                        │
                        │ Dexie dispara evento
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ useDoses()   │ │ useDoses()   │ │ useDoses()   │
│ (DoseLogger) │ │ (DoseList)   │ │ (Analytics)  │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┴────────────────┘
                        │
            Todos re-renderizam
            com dados atualizados
```

---

## Fluxo de Sincronização - Salvar no Servidor

### Fluxo Completo

```
┌─────────────────────────────────────────────────┐
│ TRIGGER: Operação CRUD no IndexedDB            │
│ (createDose, updateMedication, etc.)           │
└───────────────────┬─────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ scheduleServerSync(reason)│
        │ - reason: 'dose:create'   │
        └───────────┬───────────────┘
                    │
                    ├─► Verifica se já há timer ativo
                    │   if (state.timer) {
                    │     clearTimeout(state.timer);
                    │   }
                    │
                    ├─► Cria novo timer
                    │   state.timer = setTimeout(..., 1500);
                    │
                    ▼
        ┌───────────────────────────┐
        │ [AGUARDA 1.5 segundos]    │
        │                           │
        │ Se outra operação ocorrer,│
        │ timer é resetado          │
        └───────────┬───────────────┘
                    │
                    ▼ Timer expira (sem novas operações)
        ┌───────────────────────────┐
        │ runSync(reason)           │
        └───────────┬───────────────┘
                    │
                    ├─► Verifica se sync já está rodando
                    │   if (state.inFlight) return;
                    │
                    ├─► Marca como em execução
                    │   state.inFlight = true;
                    │
                    ▼
        ┌───────────────────────────┐
        │ saveToServer()            │
        └───────────┬───────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ exportLocalData()         │
        │                           │
        │ Exporta todas as tabelas: │
        └───────────┬───────────────┘
                    │
                    ├─► medications = await db.medications.toArray()
                    ├─► doses = await db.doses.toArray()
                    ├─► moodEntries = await db.moodEntries.toArray()
                    ├─► cognitiveTests = await db.cognitiveTests.toArray()
                    │
                    ├─► Constrói ServerData:
                    │   {
                    │     version: '1.0.0',
                    │     lastUpdated: new Date().toISOString(),
                    │     medications,
                    │     doses,
                    │     moodEntries,
                    │     cognitiveTests
                    │   }
                    │
                    ▼
        ┌───────────────────────────┐
        │ POST /api/save-data       │
        │ Content-Type: JSON        │
        │ Body: ServerData          │
        └───────────┬───────────────┘
                    │
                    ▼
        ┌────────────────────────────────────────┐
        │ Backend: save-data.js                  │
        └───────────┬────────────────────────────┘
                    │
                    ├─► [1] validateData(data)
                    │   │
                    │   ├─► Verifica campos obrigatórios
                    │   ├─► Valida tipos de arrays
                    │   ├─► Valida timestamps em doses
                    │   ├─► Valida timestamps em moodEntries
                    │   └─► Retorna { valid, error? }
                    │
                    ├─► [2] Parse timestamp
                    │   incomingTimestamp = Date.parse(data.lastUpdated)
                    │
                    ├─► [3] Lê arquivo atual
                    │   const currentFile = await fs.readFile('app-data.json')
                    │   existingSnapshot = JSON.parse(currentFile)
                    │   existingTimestamp = Date.parse(existing.lastUpdated)
                    │
                    ├─► [4] Compara timestamps
                    │   if (incomingTimestamp <= existingTimestamp) {
                    │     return 409 Conflict
                    │   }
                    │
                    ├─► [5] Cria backup
                    │   backupStamp = '2024-11-18T16-30-00-000Z'
                    │   backupPath = `app-data-${backupStamp}.json`
                    │   await fs.writeFile(backupPath, existingSnapshot)
                    │
                    ├─► [6] Salva novo arquivo
                    │   await fs.writeFile('app-data.json', data)
                    │
                    ▼
        ┌────────────────────────────────────────┐
        │ ✅ 200 OK                               │
        │ {                                      │
        │   success: true,                       │
        │   timestamp: Date.now(),               │
        │   stats: {                             │
        │     medications: 5,                    │
        │     doses: 127,                        │
        │     moodEntries: 43,                   │
        │     cognitiveTests: 8                  │
        │   }                                    │
        │ }                                      │
        └───────────┬────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ setLocalSyncTimestamp()   │
        │ - Salva em db.metadata    │
        │ - Salva em localStorage   │
        └───────────┬───────────────┘
                    │
                    ▼
        ┌───────────────────────────┐
        │ state.inFlight = false    │
        │ ✅ Sincronização completa │
        └───────────────────────────┘
```

### Tratamento de Erros

```
POST /api/save-data
    │
    ├─► [Erro de Rede]
    │   catch (error) {
    │     console.warn('Failed to save to server:', error);
    │     return { success: false, error: error.message };
    │   }
    │   
    │   ⚠️ IMPORTANTE: Dados permanecem seguros no IndexedDB local
    │   ⚠️ Próxima operação CRUD tentará sincronizar novamente
    │
    ├─► [400 Bad Request - Validação]
    │   {
    │     success: false,
    │     error: 'Invalid timestamp in dose xyz'
    │   }
    │   
    │   ⚠️ Indica problema nos dados locais
    │   ⚠️ Requer investigação/correção manual
    │
    └─► [409 Conflict - Timestamp]
        {
          success: false,
          error: 'Incoming data is older than current snapshot'
        }
        
        ⚠️ Servidor tem dados mais recentes
        ⚠️ Usuário deve carregar do servidor primeiro
```

---

## Fluxo de Sincronização - Carregar do Servidor

### Inicialização do App

```
┌─────────────────────────────┐
│ App.tsx inicializa          │
└───────────┬─────────────────┘
            │
            ├─► useEffect(() => {
            │     migrateLegacyData();
            │     loadServerData();
            │   }, []);
            │
            ▼
┌─────────────────────────────┐
│ loadServerData(force=false) │
└───────────┬─────────────────┘
            │
            ├─► [1] Verifica cache
            │   │
            │   ├─► lastSync = getLastSyncTime()
            │   │   // De localStorage
            │   │
            │   ├─► now = Date.now()
            │   │
            │   ├─► if ((now - lastSync) < 5min) {
            │   │     // Verifica se IndexedDB tem dados
            │   │     hasLocalData = await checkLocalData();
            │   │     if (hasLocalData) {
            │   │       return { success: true, version: 'cached' };
            │   │     }
            │   │   }
            │   │
            │   └─► Continue se cache expirou ou DB vazio
            │
            ▼
┌─────────────────────────────┐
│ fetchServerData()           │
└───────────┬─────────────────┘
            │
            ├─► fetch('/data/app-data.json', {
            │     cache: 'no-store'
            │   })
            │
            ├─► [Erro 404 ou Network]
            │   │
            │   └─► Verifica dados locais
            │       if (hasLocalData) {
            │         return { success: false, error: ... }
            │         // App continua funcionando offline
            │       }
            │
            ▼ [Sucesso]
┌─────────────────────────────┐
│ serverData = await response │
│   .json()                   │
└───────────┬─────────────────┘
            │
            ├─► [2] Compara timestamps
            │   │
            │   ├─► serverTimestamp = Date.parse(serverData.lastUpdated)
            │   ├─► localTimestamp = await getLocalSyncTimestamp()
            │   │
            │   └─► if (serverTimestamp < localTimestamp) {
            │         hasLocalData = await checkLocalData();
            │         if (hasLocalData) {
            │           // Local é mais recente, mantém local
            │           return { success: true, version: 'local-newer' };
            │         }
            │       }
            │
            ▼
┌─────────────────────────────┐
│ syncWithLocalDB(serverData) │
└───────────┬─────────────────┘
            │
            ├─► [1] Limpa dados existentes
            │   │
            │   ├─► await db.medications.clear()
            │   ├─► await db.doses.clear()
            │   ├─► await db.moodEntries.clear()
            │   └─► await db.cognitiveTests.clear()
            │
            ├─► [2] Normaliza timestamps
            │   │
            │   └─► normalizedDoses = serverData.doses.map(dose => ({
            │         ...dose,
            │         timestamp: normalizeTimestamp(dose.timestamp),
            │         createdAt: normalizeTimestamp(dose.createdAt)
            │       }))
            │
            ├─► [3] Insere em massa
            │   │
            │   ├─► await db.medications.bulkAdd(serverData.medications)
            │   ├─► await db.doses.bulkAdd(normalizedDoses)
            │   ├─► await db.moodEntries.bulkAdd(normalizedMoodEntries)
            │   └─► await db.cognitiveTests.bulkAdd(serverData.cognitiveTests)
            │
            ├─► [4] Atualiza metadata
            │   │
            │   ├─► await setLocalSyncTimestamp(serverTimestamp)
            │   └─► setLastSyncTime(serverTimestamp)
            │
            ▼
┌─────────────────────────────┐
│ ✅ Sincronização completa    │
│                             │
│ useLiveQuery() reage        │
│ UI atualiza automaticamente │
└─────────────────────────────┘
```

### Sincronização Manual (Botão na Interface)

```
USUÁRIO: Clica "Carregar do Servidor"
    │
    ▼
┌─────────────────────────────┐
│ DataExportImport.tsx        │
│ handleLoadFromServer()      │
└───────────┬─────────────────┘
            │
            ├─► setIsLoading(true)
            │
            ▼
┌─────────────────────────────┐
│ loadServerData(force=true)  │
│ - Ignora cache              │
│ - Força busca no servidor   │
└───────────┬─────────────────┘
            │
            └─► [Mesmo fluxo acima, mas sem verificação de cache]
            
┌─────────────────────────────┐
│ [Sucesso]                   │
│ - toast.success(...)        │
│ - Exibe estatísticas:       │
│   "5 meds, 127 doses, ..."  │
│                             │
│ [Erro]                      │
│ - toast.error(...)          │
│ - Exibe mensagem de erro    │
└─────────────────────────────┘
```

---

## Fluxo de Migração de Dados Legados

### Detectar e Migrar Dados Antigos

```
┌─────────────────────────────────────────┐
│ App inicializa                          │
│ useEffect(() => {                       │
│   migrateLegacyData();                  │
│ }, []);                                 │
└───────────┬─────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│ migrateLegacyData()                      │
└───────────┬───────────────────────────────┘
            │
            ├─► [1] Abre IndexedDB
            │   await db.open()
            │
            ├─► [2] Conta registros existentes
            │   │
            │   ├─► medicationsCount = await db.medications.count()
            │   ├─► dosesCount = await db.doses.count()
            │   ├─► moodCount = await db.moodEntries.count()
            │   └─► cognitiveCount = await db.cognitiveTests.count()
            │
            ├─► [3] Verifica se DB já tem dados
            │   │
            │   └─► if (totalCount > 0) {
            │         console.log('DB já tem dados, marcando migração');
            │         await db.metadata.put({
            │           key: 'legacyKvMigration',
            │           value: true
            │         });
            │         return; // ✅ Migração desnecessária
            │       }
            │
            ├─► [4] Verifica flag de migração
            │   │
            │   └─► migrationFlag = await db.metadata.get('legacyKvMigration')
            │       if (migrationFlag?.value === true) {
            │         // DB vazio mas flag setada - ERRO!
            │         console.warn('Flag setada mas DB vazio, migrando...');
            │       }
            │
            ▼
┌───────────────────────────────────────────┐
│ loadLegacyState()                        │
│ - Busca dados de múltiplas fontes        │
└───────────┬───────────────────────────────┘
            │
            ├─► [Fonte 1] localStorage
            │   │
            │   ├─► Tenta chaves:
            │   │   - 'medications'
            │   │   - 'spark-kv:medications'
            │   │   - 'sparkkv:medications'
            │   │   - 'SPARK_KV:medications'
            │   │   - etc.
            │   │
            │   └─► medications = JSON.parse(localStorage.getItem(key))
            │
            ├─► [Fonte 2] sessionStorage
            │   └─► [Mesmas chaves]
            │
            ├─► [Fonte 3] Variáveis Globais
            │   │
            │   ├─► window.__SPARK_KV_INITIAL_STATE__
            │   ├─► window.__SPARK_KV_CACHE__
            │   ├─► window.__sparkKV__
            │   └─► window.sparkKvInitialState
            │
            ▼
┌───────────────────────────────────────────┐
│ Dados legados encontrados:               │
│ {                                        │
│   medications: [...],                    │
│   doses: [...],                          │
│   moodEntries: [...],                    │
│   cognitiveTests: [...]                  │
│ }                                        │
└───────────┬───────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│ Normalização e Validação                 │
└───────────┬───────────────────────────────┘
            │
            ├─► Medications:
            │   medications.map(ensureMedication)
            │   │
            │   ├─► normalizeMedicationRecord()
            │   │   - Garante campos obrigatórios
            │   │   - Define timestamps se ausentes
            │   │   - Aplica valores padrão
            │   │
            │   └─► Retorna: Medication válido
            │
            ├─► Doses:
            │   doses.map(ensureDose)
            │   │
            │   ├─► normalizeTimestamp(timestamp)
            │   │   - Converte string para number
            │   │   - Valida range
            │   │
            │   └─► Retorna: MedicationDose válido
            │
            └─► MoodEntries:
                moodEntries.map(ensureMoodEntry)
                │
                └─► [Mesma normalização]
            
            ▼
┌───────────────────────────────────────────┐
│ Inserção em Massa (Bulk Operations)     │
└───────────┬───────────────────────────────┘
            │
            ├─► if (medications.length > 0) {
            │     await db.medications.bulkPut(medications)
            │     console.log(`Migrated ${medications.length} meds`)
            │   }
            │
            ├─► if (doses.length > 0) {
            │     await db.doses.bulkPut(doses)
            │     console.log(`Migrated ${doses.length} doses`)
            │   }
            │
            ├─► if (moodEntries.length > 0) {
            │     await db.moodEntries.bulkPut(moodEntries)
            │     console.log(`Migrated ${moodEntries.length} moods`)
            │   }
            │
            └─► if (cognitiveTests.length > 0) {
                  await db.cognitiveTests.bulkPut(cognitiveTests)
                }
            
            ▼
┌───────────────────────────────────────────┐
│ Marca migração como completa             │
│                                          │
│ await db.metadata.put({                  │
│   key: 'legacyKvMigration',              │
│   value: true,                           │
│   updatedAt: Date.now()                  │
│ })                                       │
└───────────┬───────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│ ✅ Migração Completa!                     │
│                                          │
│ - Dados agora em IndexedDB               │
│ - Flag de migração setada                │
│ - Não será executada novamente           │
└───────────────────────────────────────────┘
```

---

## Fluxo de Invalidação de Cache

### Quando uma Dose é Criada/Atualizada/Deletada

```
OPERAÇÃO: createDose() / updateDose() / deleteDose()
    │
    ▼
┌─────────────────────────────────────────┐
│ invalidateCache(medicationId)           │
└───────────┬─────────────────────────────┘
            │
            ├─► [Cache 1] LRU Cache Farmacocinético
            │   │
            │   └─► pkCache.invalidate(medicationId)
            │       │
            │       ├─► Remove todas as entradas do LRU
            │       │   onde key começa com medicationId
            │       │
            │       └─► Próximo cálculo de concentração
            │           será recalculado completamente
            │
            ├─► [Cache 2] React Query - Curvas de Concentração
            │   │
            │   └─► queryClient.invalidateQueries({
            │         queryKey: ['concentration-curve'],
            │         predicate: (query) => {
            │           // Invalida só queries deste medicamento
            │           return query.queryKey[1] === medicationId;
            │         }
            │       })
            │       │
            │       └─► Gráficos de concentração
            │           serão recalculados na próxima renderização
            │
            └─► [Cache 3] React Query - Pontos de Concentração
                │
                └─► queryClient.invalidateQueries({
                      queryKey: ['concentration-point'],
                      predicate: (query) => {
                        return query.queryKey[1] === medicationId;
                      }
                    })
                    │
                    └─► Valores pontuais de concentração
                        serão recalculados

┌─────────────────────────────────────────┐
│ EFEITO CASCATA:                         │
│                                         │
│ 1. AnalyticsDashboard                   │
│    └─► Gráfico de concentração          │
│        plasmática re-renderiza          │
│                                         │
│ 2. ConcentrationChart                   │
│    └─► Curva farmacocinética            │
│        recalculada                      │
│                                         │
│ 3. MoodCorrelation                      │
│    └─► Correlação medicamento-humor    │
│        atualizada                       │
│                                         │
│ 4. TherapeuticRange                     │
│    └─► Indicadores de faixa            │
│        terapêutica atualizados          │
└─────────────────────────────────────────┘
```

### Sistema de Cache Multinível

```
┌───────────────────────────────────────────────────┐
│              HIERARQUIA DE CACHE                  │
└───────────────────────────────────────────────────┘

[Nível 1] Dexie useLiveQuery() - Reatividade
    │
    ├─► Sempre atualizado automaticamente
    ├─► Detecta mudanças no IndexedDB
    └─► TTL: Infinito (até mudança)
    
[Nível 2] React Query Cache
    │
    ├─► Cache de queries complexas
    ├─► TTL: 5 minutos (staleTime)
    ├─► Invalidação manual via queryClient
    └─► Usado para: cálculos farmacocinéticos

[Nível 3] LRU Cache (pkCache)
    │
    ├─► Cache de cálculos farmacocinéticos individuais
    ├─► TTL: 5 minutos
    ├─► Max: 1000 entradas
    ├─► Eviction: Least Recently Used
    └─► Usado para: calculateConcentration()

[Nível 4] localStorage (Sync Timestamps)
    │
    ├─► Armazena timestamp da última sincronização
    ├─► Chave: 'server_data_last_sync'
    ├─► Usado para: Evitar syncs desnecessários
    └─► TTL: 5 minutos (lógica de validação)

[Nível 5] IndexedDB.metadata (Sync Timestamps)
    │
    ├─► Armazena timestamp da última sincronização
    ├─► Chave: 'server_data_last_sync_ts'
    ├─► Mais confiável que localStorage
    └─► Usado para: Detecção de conflitos
```

---

## Resumo dos Pontos Críticos

### Garantias do Sistema

```
✅ ATOMICIDADE
   - Transações garantem consistência
   - Deletar medicamento = deletar doses
   - Rollback automático em caso de erro

✅ REATIVIDADE
   - useLiveQuery() mantém UI sincronizada
   - Múltiplos componentes atualizam juntos
   - Funciona entre tabs/windows

✅ PERFORMANCE
   - Índices otimizados para queries frequentes
   - Cache multinível evita cálculos repetidos
   - Bulk operations para inserções em massa

✅ SINCRONIZAÇÃO
   - Debounce evita requisições excessivas
   - Detecção de conflitos via timestamps
   - Backup automático antes de sobrescrever

✅ CONFIABILIDADE
   - Dados sempre seguros no IndexedDB local
   - App funciona offline completamente
   - Migração automática de dados legados

✅ SEGURANÇA
   - Validação de dados no backend
   - Timestamps prevenindo corrupção
   - Backup automático de snapshots
```

### Fluxos que Exigem Atenção Especial

```
⚠️ TRANSAÇÕES ATÔMICAS
   Sempre usar db.transaction() para operações relacionadas
   Exemplo: Deletar medicamento + doses

⚠️ INVALIDAÇÃO DE CACHE
   Sempre invalidar cache após alterar doses
   Importante para precisão de cálculos farmacocinéticos

⚠️ NORMALIZAÇÃO DE TIMESTAMPS
   Sempre normalizar antes de inserir no DB
   Previne problemas com timezones e formatos

⚠️ DETECÇÃO DE DADOS LEGADOS
   Verificar múltiplas fontes durante migração
   localStorage, sessionStorage, window globals

⚠️ VERIFICAÇÃO DE INTEGRIDADE
   Antes de confiar em timestamp de sync,
   verificar se IndexedDB realmente tem dados
```

---

Este documento apresentou os fluxogramas completos do sistema de armazenamento e resgate de dados. Para detalhes de implementação e exemplos de código, consulte `DOCUMENTACAO_ARMAZENAMENTO_DADOS.md`.
