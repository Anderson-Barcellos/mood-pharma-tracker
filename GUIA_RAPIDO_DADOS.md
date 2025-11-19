# Guia Rápido: Documentação do Sistema de Dados

## 📚 Documentação Disponível

Este projeto agora possui documentação completa em português sobre o sistema de armazenamento e resgate de dados.

### Documentos Principais

1. **[DOCUMENTACAO_ARMAZENAMENTO_DADOS.md](./DOCUMENTACAO_ARMAZENAMENTO_DADOS.md)**
   - Documentação técnica completa (30KB+)
   - Arquitetura do sistema
   - Estrutura de dados (Medication, MedicationDose, MoodEntry)
   - Processos CRUD detalhados
   - Sistema de sincronização
   - Cache e performance
   - Exemplos práticos de código

2. **[FLUXOGRAMAS_DADOS.md](./FLUXOGRAMAS_DADOS.md)**
   - Diagramas ASCII detalhados (40KB+)
   - 9 fluxogramas completos
   - Visualização de processos
   - Fluxos de sincronização
   - Invalidação de cache

---

## 🎯 O Que Está Documentado

### 📦 Armazenamento de Dados

#### Medicamentos (Medications)
- **Criar**: `createMedication(payload)` → IndexedDB → Servidor
- **Atualizar**: `updateMedication(id, updates)` → Merge + Sync
- **Deletar**: `deleteMedication(id)` → Transação Atômica (med + doses)
- **Listar**: `useMedications()` → Reatividade automática

#### Doses (Medication Doses)
- **Registrar**: `createDose(payload)` → IndexedDB → Invalidação de cache
- **Atualizar**: `updateDose(id, updates)` → Cache farmacocinético limpo
- **Deletar**: `deleteDose(id)` → Remoção + Recálculo de concentrações
- **Consultar**: `useDoses(medicationId?)` → Filtros por medicamento

#### Humor (Mood Entries)
- **Registrar**: `createMoodEntry(payload)` → 6 dimensões (mood, anxiety, energy, focus, sensitivity, motivation)
- **Atualizar**: `updateMoodEntry(id, updates)`
- **Deletar**: `deleteMoodEntry(id)`
- **Visualizar**: `useMoodEntries()` → Histórico + Tendências

### 🔄 Sincronização

#### Local → Servidor (Automática)
```
Operação CRUD
    ↓
Debounce 1.5s
    ↓
Exporta todas as tabelas
    ↓
POST /api/save-data
    ↓
Validação + Backup + Salva JSON
```

#### Servidor → Local (Manual ou Inicialização)
```
App inicia / Botão "Carregar"
    ↓
Verifica cache (5 min)
    ↓
Busca app-data.json
    ↓
Compara timestamps
    ↓
Sincroniza se servidor mais recente
```

### 💾 Tecnologias

- **IndexedDB**: Banco de dados local no navegador
- **Dexie.js**: ORM para IndexedDB com queries reativas
- **React Query**: Cache de queries complexas (TTL 5min)
- **LRU Cache**: Cache farmacocinético (TTL 5min)
- **Express.js**: API backend opcional para sincronização

---

## 🚀 Exemplos Rápidos

### Adicionar Medicamento
```typescript
import { useMedications } from '@/hooks/use-medications';

const { createMedication } = useMedications();

await createMedication({
  name: 'Venvanse',
  genericName: 'Lisdexanfetamina',
  halfLife: 10.5,
  volumeOfDistribution: 0.3,
  bioavailability: 0.95,
  absorptionRate: 2.0,
  defaultDose: 50,
  unit: 'mg'
});
// ✅ Salvo no IndexedDB + Sincronizado automaticamente
```

### Registrar Dose
```typescript
import { useDoses } from '@/hooks/use-doses';

const { createDose } = useDoses();

await createDose({
  medicationId: 'uuid-do-medicamento',
  timestamp: Date.now(),
  doseAmount: 50,
  route: 'oral',
  notes: 'Dose matinal'
});
// ✅ Salvo + Cache farmacocinético invalidado + Gráficos atualizados
```

### Registrar Humor
```typescript
import { useMoodEntries } from '@/hooks/use-mood-entries';

const { createMoodEntry } = useMoodEntries();

await createMoodEntry({
  timestamp: Date.now(),
  moodScore: 7,        // 0-10
  anxietyLevel: 4,     // 0-10
  energyLevel: 6,      // 0-10
  focusLevel: 8,       // 0-10
  notes: 'Dia produtivo'
});
// ✅ Salvo + UI atualiza automaticamente
```

### Visualizar Dados
```typescript
import { useMedications } from '@/hooks/use-medications';

function MedicationList() {
  const { medications, isLoading } = useMedications();
  
  // medications é um array reativo
  // Atualiza automaticamente quando dados mudam
  
  return (
    <ul>
      {medications.map(med => (
        <li key={med.id}>{med.name}</li>
      ))}
    </ul>
  );
}
```

---

## 📊 Estrutura do Sistema

```
┌──────────────────┐
│  React Component │
│  - DoseLogger    │
│  - MoodView      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Custom Hooks   │
│  - useDoses()    │
│  - useMoods()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│    Dexie.js      │
│   (IndexedDB)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Browser Storage │
│   MoodPharmaDB   │
└──────────────────┘

     ⇅ Sync ⇅

┌──────────────────┐
│  Express API     │
│  /api/save-data  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   File System    │
│  app-data.json   │
└──────────────────┘
```

---

## 🔍 Características Principais

### ✅ Local-First
- Todos os dados ficam primariamente no navegador
- Funciona completamente offline (PWA)
- Sincronização com servidor é opcional

### ✅ Reatividade
- `useLiveQuery()` detecta mudanças automaticamente
- UI atualiza sem reload
- Múltiplos componentes sincronizados

### ✅ Performance
- Índices otimizados para queries frequentes
- Cache multinível (React Query + LRU)
- Bulk operations para inserções em massa
- P50 < 50ms para operações CRUD

### ✅ Confiabilidade
- Transações atômicas (ex: deletar med + doses)
- Backup automático antes de sobrescrever
- Detecção de conflitos via timestamps
- Migração automática de dados legados

### ✅ Segurança
- Validação robusta no backend
- Timestamps previnem corrupção
- Sistema de backup incremental
- Armazenamento isolado por origem

---

## 📖 Como Usar Esta Documentação

### Para Desenvolvedores
1. Leia **DOCUMENTACAO_ARMAZENAMENTO_DADOS.md** para entender a arquitetura
2. Consulte **FLUXOGRAMAS_DADOS.md** para visualizar fluxos
3. Use os exemplos de código como referência
4. Consulte os arquivos fonte para detalhes de implementação

### Para Debugging
1. Veja seção "Manutenção e Debugging" na documentação principal
2. Use Chrome DevTools → Application → IndexedDB
3. Verifique cache: `window.__perfMonitor?.getReport()`
4. Limpe dados: `await db.delete(); location.reload();`

### Para Novas Features
1. Entenda o fluxo completo no FLUXOGRAMAS_DADOS.md
2. Siga os padrões existentes (CRUD + sync + cache)
3. Adicione validação e normalização
4. Atualize índices se necessário

---

## 🔗 Links Úteis

- **Dexie.js Docs**: https://dexie.org/
- **IndexedDB API**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **React Query**: https://tanstack.com/query/latest

---

## 📝 Arquivos do Sistema

### Core Database
- `src/core/database/db.ts` - Configuração IndexedDB + Dexie
- `src/core/database/medication-helpers.ts` - Normalização de medicamentos

### React Hooks
- `src/hooks/use-medications.ts` - CRUD medicamentos
- `src/hooks/use-doses.ts` - CRUD doses + cache invalidation
- `src/hooks/use-mood-entries.ts` - CRUD registros de humor
- `src/hooks/use-doses-range.ts` - Consultas por período

### Sincronização
- `src/core/services/server-sync.ts` - Debounce + agendamento
- `src/core/services/server-data-loader.ts` - Sync bidirecional

### Backend
- `api/save-data.js` - Express endpoint com validação

### Types
- `src/shared/types.ts` - Interfaces TypeScript

---

## 🎓 Glossário

- **IndexedDB**: Banco de dados no navegador, persistente
- **Dexie**: Biblioteca ORM para IndexedDB
- **useLiveQuery**: Hook reativo do Dexie
- **CRUD**: Create, Read, Update, Delete
- **Sync**: Sincronização de dados
- **TTL**: Time To Live (tempo de vida do cache)
- **LRU**: Least Recently Used (algoritmo de cache)
- **Debounce**: Atraso antes de executar ação
- **Transação Atômica**: Operação tudo-ou-nada

---

## 📞 Suporte

Para dúvidas sobre o sistema de dados:
1. Consulte a documentação completa
2. Veja os fluxogramas para entender processos
3. Analise os exemplos práticos
4. Revise o código fonte dos hooks

**Documentação mantida por**: Anderson Barcellos  
**Última atualização**: Novembro 2024
