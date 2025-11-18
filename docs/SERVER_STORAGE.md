# Server-First Data Storage System

## Visão Geral

O sistema de armazenamento de dados foi modificado para usar o servidor como fonte primária de dados, ao invés do navegador (IndexedDB). Isso permite que os dados sejam acessados de qualquer dispositivo e lugar.

## Arquitetura

### Antes (Browser-First)
```
┌─────────────┐
│  IndexedDB  │ ← Armazenamento Principal (navegador)
└──────┬──────┘
       │
       │ Sync Opcional
       ▼
┌─────────────┐
│   Servidor  │ ← Backup/Sync
└─────────────┘
```

### Agora (Server-First)
```
┌─────────────┐
│   Servidor  │ ← Armazenamento Principal (arquivos JSON)
└──────┬──────┘
       │
       │ HTTP REST API
       ▼
┌─────────────┐
│ React Query │ ← Cache Local (1 minuto)
└─────────────┘
```

## Componentes

### 1. Servidor API (`api/server.js`)

**Porta:** 3001 (padrão)

**Endpoints:**

#### Medicamentos
- `GET /api/medications` - Lista todos os medicamentos
- `GET /api/medications/:id` - Busca um medicamento específico
- `POST /api/medications` - Cria um medicamento
- `PUT /api/medications/:id` - Atualiza um medicamento
- `DELETE /api/medications/:id` - Deleta um medicamento (e suas doses)

#### Administrações de Doses
- `GET /api/doses` - Lista todas as doses (aceita `?medicationId=xxx`)
- `GET /api/doses/:id` - Busca uma dose específica
- `POST /api/doses` - Cria uma dose
- `PUT /api/doses/:id` - Atualiza uma dose
- `DELETE /api/doses/:id` - Deleta uma dose

#### Registros de Humor
- `GET /api/mood-entries` - Lista todos os registros de humor
- `GET /api/mood-entries/:id` - Busca um registro específico
- `POST /api/mood-entries` - Cria um registro de humor
- `PUT /api/mood-entries/:id` - Atualiza um registro de humor
- `DELETE /api/mood-entries/:id` - Deleta um registro de humor

#### Testes Cognitivos
- `GET /api/cognitive-tests` - Lista todos os testes
- `POST /api/cognitive-tests` - Cria um teste
- `DELETE /api/cognitive-tests/:id` - Deleta um teste

#### Outros
- `GET /api/health` - Health check
- `POST /api/save-data` - Endpoint legado (compatibilidade)

### 2. Cliente API (`src/core/services/server-api.ts`)

Wrapper TypeScript para comunicação com a API:

```typescript
import * as serverApi from '@/core/services/server-api';

// Exemplo de uso
const medications = await serverApi.fetchMedications();
const medication = await serverApi.createMedication(newMed);
await serverApi.updateMedication(id, updates);
await serverApi.deleteMedication(id);
```

### 3. Hooks React Atualizados

Todos os hooks foram migrados de `useLiveQuery` (Dexie) para `useQuery` (React Query):

- `useMedications()` - Gerencia medicamentos
- `useDoses(medicationId?)` - Gerencia doses
- `useMoodEntries()` - Gerencia registros de humor
- `useCognitiveTests()` - Gerencia testes cognitivos
- `useDosesRange()` - Busca doses em intervalo de tempo

**Exemplo:**
```typescript
const { medications, createMedication, isLoading } = useMedications();
```

### 4. Armazenamento em Arquivos

Os dados são armazenados em arquivos JSON em `/public/data/`:

```
public/data/
├── medications.json       # Lista de medicamentos
├── doses.json            # Lista de administrações
├── mood-entries.json     # Lista de registros de humor
├── cognitive-tests.json  # Lista de testes cognitivos
└── README.md            # Documentação
```

**Backups Automáticos:**
Antes de sobrescrever qualquer arquivo, o servidor cria um backup:
- Formato: `{arquivo}-backup-{timestamp}.json`
- Exemplo: `medications-backup-1700000000000.json`

## Como Usar

### Desenvolvimento

1. **Iniciar o servidor API:**
   ```bash
   npm run dev:api
   ```

2. **Iniciar o frontend:**
   ```bash
   npm run dev
   ```

3. **Ou iniciar ambos simultaneamente:**
   ```bash
   npm run dev:all
   ```

### Produção

1. **Build do frontend:**
   ```bash
   npm run build
   ```

2. **Iniciar servidor API:**
   ```bash
   node api/server.js
   ```
   Ou configurar como serviço systemd.

### Variáveis de Ambiente

- `VITE_API_URL` - URL da API (padrão: `http://localhost:3001/api`)
- `API_PORT` - Porta do servidor API (padrão: `3001`)

**Exemplo `.env`:**
```bash
VITE_API_URL=http://localhost:3001/api
API_PORT=3001
```

## Migração de Dados

Para usuários existentes que têm dados no IndexedDB:

### 1. Via Interface (Recomendado)

Um diálogo de migração aparecerá automaticamente se dados locais forem detectados. Basta clicar em "Migrar para Servidor".

### 2. Via Código

```typescript
import { migrateDataToServer, checkForMigrationData } from '@/core/services/data-migration';

// Verificar se há dados para migrar
const { hasData, counts } = await checkForMigrationData();

// Migrar dados
const result = await migrateDataToServer();

console.log('Migração:', result);
```

### 3. Manual

Exporte os dados do navegador e importe no servidor manualmente se necessário.

## Cache e Performance

### React Query Cache

- **Duração:** 1 minuto (configurable via `staleTime`)
- **Invalidação:** Automática após mutações (create/update/delete)
- **Refetch:** Automático ao focar janela do navegador

### Farmacocinetíca Cache

Mantém cache separado para cálculos farmacocinetícos complexos:
- Invalidado automaticamente ao modificar doses
- Chave: medicationId + timestamp

## Segurança

⚠️ **IMPORTANTE:** Os arquivos JSON contêm dados de saúde pessoais!

### Recomendações de Produção

1. **Autenticação:** Adicionar autenticação JWT ou similar
2. **HTTPS:** Usar SSL/TLS em produção
3. **Backup:** Configurar backups automáticos regulares
4. **Permissões:** Restringir acesso aos arquivos de dados
5. **Rate Limiting:** Adicionar limitação de requisições

### CORS

Em desenvolvimento, CORS está habilitado para `*`. Em produção:

```javascript
// api/server.js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://seu-dominio.com');
  // ...
});
```

## Troubleshooting

### Servidor não inicia

**Erro:** `EADDRINUSE`
```bash
# Verificar porta
lsof -i :3001

# Matar processo
npm run kill:all
```

### Dados não aparecem

1. Verificar se servidor está rodando:
   ```bash
   curl http://localhost:3001/api/health
   ```

2. Verificar arquivos de dados:
   ```bash
   ls -la public/data/
   cat public/data/medications.json
   ```

3. Verificar logs do servidor:
   ```bash
   # Se rodando em background
   tail -f /tmp/api-server.log
   ```

### Erro de CORS

Verificar se a URL da API está correta:
```bash
# .env
VITE_API_URL=http://localhost:3001/api
```

### Migração falha

1. Verificar se servidor está rodando
2. Verificar permissões do diretório `/public/data/`
3. Verificar logs do console do navegador
4. Tentar migração manual

## Backup e Restauração

### Backup Manual

```bash
# Backup de todos os dados
tar -czf mood-pharma-backup-$(date +%Y%m%d).tar.gz public/data/*.json

# Backup individual
cp public/data/medications.json backups/medications-$(date +%Y%m%d).json
```

### Restauração

```bash
# Restaurar de backup
tar -xzf mood-pharma-backup-20231115.tar.gz

# Ou copiar arquivo individual
cp backups/medications-20231115.json public/data/medications.json
```

### Backup Automático

O servidor cria backups automáticos antes de cada sobrescrita:
- Localização: `public/data/`
- Formato: `{arquivo}-backup-{timestamp}.json`
- Retenção: Manual (implementar script de limpeza se necessário)

## Limitações Conhecidas

1. **Concorrência:** Sem lock de arquivos, pode haver race conditions em alta concorrência
2. **Escalabilidade:** Arquivos JSON não escalam para grandes volumes (considerar migrar para BD)
3. **Busca:** Sem índices, buscas são lineares O(n)
4. **Transações:** Não há suporte a transações ACID

## Roadmap

- [ ] Adicionar autenticação JWT
- [ ] Implementar WebSockets para updates em tempo real
- [ ] Migrar para banco de dados (PostgreSQL/SQLite)
- [ ] Adicionar testes automatizados
- [ ] Implementar rate limiting
- [ ] Adicionar logs estruturados
- [ ] Criar painel de administração
