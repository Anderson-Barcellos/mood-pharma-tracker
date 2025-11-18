# Atualização do Sistema de Armazenamento - Server-First

## 🎯 Objetivo

Modificar o sistema de armazenamento de dados para que **medicamentos, administrações e registros de humor sejam salvos primariamente no servidor** (em arquivos) ao invés do navegador (IndexedDB), permitindo acesso de qualquer lugar.

## ✅ Status: IMPLEMENTADO

Todo o sistema foi migrado com sucesso para armazenamento server-first.

## 🏗️ Arquitetura

### Antes (Browser-First)
```
┌─────────────┐
│  IndexedDB  │ ← Dados armazenados apenas no navegador
└──────┬──────┘
       │ Sync opcional
       ▼
┌─────────────┐
│   Servidor  │ ← Apenas backup
└─────────────┘
```

### Agora (Server-First)
```
┌─────────────┐
│   Servidor  │ ← Dados armazenados no servidor (arquivos JSON)
│  (port 3001)│    - medications.json
└──────┬──────┘    - doses.json
       │            - mood-entries.json
       │ REST API   - cognitive-tests.json
       ▼
┌─────────────┐
│ React Query │ ← Cache temporário (1 minuto)
│   Frontend  │    Acessível de qualquer lugar
└─────────────┘
```

## 📦 Arquivos Criados/Modificados

### Novos Arquivos
- ✅ `api/server.js` - Servidor REST API completo
- ✅ `src/core/services/server-api.ts` - Cliente API TypeScript
- ✅ `src/core/services/data-migration.ts` - Utilitário de migração
- ✅ `src/shared/components/DataMigrationDialog.tsx` - UI de migração
- ✅ `docs/SERVER_STORAGE.md` - Documentação completa
- ✅ `public/data/README.md` - Documentação da estrutura de dados

### Arquivos Modificados
- ✅ `src/hooks/use-medications.ts` - Dexie → React Query + Server API
- ✅ `src/hooks/use-doses.ts` - Dexie → React Query + Server API
- ✅ `src/hooks/use-mood-entries.ts` - Dexie → React Query + Server API
- ✅ `src/hooks/use-cognitive-tests.ts` - Dexie → React Query + Server API
- ✅ `src/hooks/use-doses-range.ts` - Dexie → React Query + Server API
- ✅ `package.json` - Atualizado `dev:api` script

## 🚀 Como Usar

### Desenvolvimento

```bash
# Opção 1: Iniciar API e Frontend separadamente
npm run dev:api  # Terminal 1 - API na porta 3001
npm run dev      # Terminal 2 - Frontend na porta 8112

# Opção 2: Iniciar ambos simultaneamente
npm run dev:all
```

### Produção

```bash
# 1. Build do frontend
npm run build

# 2. Iniciar servidor API
node api/server.js

# O servidor estará disponível em http://localhost:3001
```

## 📊 Endpoints da API

### Medicamentos
- `GET /api/medications` - Listar todos
- `GET /api/medications/:id` - Buscar por ID
- `POST /api/medications` - Criar
- `PUT /api/medications/:id` - Atualizar
- `DELETE /api/medications/:id` - Deletar

### Administrações de Doses
- `GET /api/doses` - Listar todas (aceita `?medicationId=xxx`)
- `GET /api/doses/:id` - Buscar por ID
- `POST /api/doses` - Criar
- `PUT /api/doses/:id` - Atualizar
- `DELETE /api/doses/:id` - Deletar

### Registros de Humor
- `GET /api/mood-entries` - Listar todos
- `GET /api/mood-entries/:id` - Buscar por ID
- `POST /api/mood-entries` - Criar
- `PUT /api/mood-entries/:id` - Atualizar
- `DELETE /api/mood-entries/:id` - Deletar

### Testes Cognitivos
- `GET /api/cognitive-tests` - Listar todos
- `POST /api/cognitive-tests` - Criar
- `DELETE /api/cognitive-tests/:id` - Deletar

### Outros
- `GET /api/health` - Health check

## 💾 Estrutura de Dados

Os dados são armazenados em arquivos JSON no diretório `/public/data/`:

```
public/data/
├── medications.json      # Array de objetos Medication
├── doses.json           # Array de objetos MedicationDose
├── mood-entries.json    # Array de objetos MoodEntry
├── cognitive-tests.json # Array de objetos CognitiveTest
└── README.md           # Documentação
```

### Backups Automáticos

O servidor cria backups antes de sobrescrever dados:
- Formato: `{arquivo}-backup-{timestamp}.json`
- Exemplo: `medications-backup-1700000000000.json`

## 🔄 Migração de Dados Existentes

Para usuários que já possuem dados no IndexedDB (navegador):

1. **Detecção Automática**: Ao abrir a aplicação, um diálogo aparecerá se dados locais forem detectados
2. **Migração com Um Clique**: Clicar em "Migrar para Servidor"
3. **Relatório Detalhado**: Ver estatísticas de sucesso/erros
4. **Limpeza Opcional**: Opção de limpar dados locais após migração bem-sucedida

## 🔒 Segurança

### Implementado
- ✅ Rate limiting: 100 requisições por 15 minutos por IP
- ✅ Validação de dados em todos os endpoints
- ✅ Backup automático antes de sobrescrever
- ✅ CORS configurável

### Para Produção
⚠️ **Importante**: Antes de usar em produção, implementar:
- [ ] Autenticação JWT
- [ ] HTTPS/SSL
- [ ] Restringir CORS ao domínio específico
- [ ] Logs de auditoria
- [ ] Backup automatizado em serviço externo

## 📝 Testes Realizados

✅ **API Endpoints**:
- Todos os endpoints CRUD testados e funcionando
- Deleção em cascata funcionando
- Filtros de query funcionando

✅ **Build & Deploy**:
- TypeScript compila sem erros críticos
- Build Vite otimizado
- Servidor inicia corretamente

✅ **Segurança**:
- CodeQL scanner executado
- Rate limiting implementado

## 📚 Documentação Completa

Ver `docs/SERVER_STORAGE.md` para:
- Referência completa de API
- Guia de deployment
- Troubleshooting
- Backup e restauração
- Limitações conhecidas
- Roadmap futuro

## 🐛 Troubleshooting

### Servidor não inicia
```bash
# Verificar se porta 3001 está em uso
lsof -i :3001

# Matar processos
npm run kill:all
```

### Dados não aparecem
```bash
# Verificar se servidor está rodando
curl http://localhost:3001/api/health

# Verificar arquivos de dados
ls -la public/data/
```

### Erro de CORS
Verificar `.env`:
```bash
VITE_API_URL=http://localhost:3001/api
```

## 🔮 Próximas Melhorias (Opcionais)

- [ ] Autenticação JWT
- [ ] WebSockets para updates em tempo real
- [ ] Migrar para banco de dados (PostgreSQL/SQLite)
- [ ] Testes automatizados
- [ ] Logs estruturados
- [ ] Painel de administração

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar documentação em `docs/SERVER_STORAGE.md`
2. Verificar logs do servidor e console do navegador
3. Abrir issue no GitHub com logs e descrição

---

**Data de Implementação**: 2025-11-18
**Versão**: 1.0.0
**Status**: ✅ Pronto para uso
