# 🚀 Deployment Guide - Mood Pharma Tracker

## Configuração do Servidor

### 1. Configurar API Key do Gemini

O sistema usa o Gemini 2.5 Pro para gerar matrizes cognitivas. Você precisa configurar a API key:

#### Opção A: Variável de Ambiente (Recomendado)

```bash
export GEMINI_API_KEY="sua-api-key-aqui"
```

Para tornar permanente, adicione ao seu `.bashrc` ou `.bash_profile`:

```bash
echo 'export GEMINI_API_KEY="sua-api-key-aqui"' >> ~/.bashrc
source ~/.bashrc
```

#### Opção B: Arquivo .env

Crie um arquivo `.env` na raiz do projeto:

```bash
# .env
GEMINI_API_KEY=sua-api-key-aqui
API_PORT=3001
```

**IMPORTANTE**: Adicione `.env` ao `.gitignore` para não expor sua chave!

```bash
echo ".env" >> .gitignore
```

### 2. Obter API Key do Gemini

1. Acesse: https://aistudio.google.com/app/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### 3. Instalar Dependências

```bash
npm install
```

### 4. Iniciar o Servidor

#### Desenvolvimento (Frontend + Backend)

```bash
npm run dev
```

Isso inicia:
- Frontend (Vite) na porta 5173
- Backend precisa ser iniciado separadamente (veja abaixo)

#### Backend Standalone

```bash
node api/save-data.js &
node api/generate-matrix.js &
```

Ou use um process manager como PM2:

```bash
npm install -g pm2

pm2 start api/save-data.js --name "mood-pharma-api"
pm2 start api/generate-matrix.js --name "matrix-generator"
pm2 save
pm2 startup
```

### 5. Verificar Configuração

#### Health Check do Servidor

```bash
curl http://localhost:3001/api/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "service": "matrix-generator",
  "hasApiKey": true
}
```

Se `hasApiKey` for `false`, a variável `GEMINI_API_KEY` não está configurada.

#### Testar Geração de Matriz

```bash
curl -X POST http://localhost:3001/api/generate-matrix \
  -H "Content-Type: application/json" \
  -d '{"difficulty": "normal"}'
```

### 6. Estrutura de Dados

Os dados são salvos em:

```
/root/CODEX/mood-pharma-tracker/public/data/
├── app-data.json              # Dados atuais
└── app-data-YYYY-MM-DD*.json  # Backups automáticos
```

**Formato de `app-data.json`**:

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-01-03T12:00:00.000Z",
  "medications": [...],
  "doses": [...],
  "moodEntries": [...],
  "cognitiveTests": [...]
}
```

### 7. Backup Automático

O sistema cria backups automáticos antes de cada atualização:
- Formato: `app-data-YYYY-MM-DDTHH-MM-SS.json`
- Localização: `public/data/`

Para fazer backup manual:

```bash
cp public/data/app-data.json public/data/app-data-backup-$(date +%Y%m%d).json
```

## Troubleshooting

### Erro: "GEMINI_API_KEY not configured"

**Causa**: API key não configurada.

**Solução**:
```bash
export GEMINI_API_KEY="sua-chave-aqui"
node api/generate-matrix.js
```

### Erro: "Gemini API error (400)"

**Causa**: API key inválida ou expirada.

**Solução**:
1. Gere nova chave em https://aistudio.google.com/app/apikey
2. Atualize a variável de ambiente
3. Reinicie o servidor

### Erro: "Timeout: servidor não respondeu"

**Causa**: Servidor backend não está rodando ou demorou muito.

**Solução**:
1. Verifique se o servidor está rodando: `ps aux | grep "api/"`
2. Inicie o servidor: `node api/generate-matrix.js`
3. Verifique logs para erros

### Dados não sincronizam

**Causa**: Endpoint `/api/save-data` não está respondendo.

**Solução**:
1. Verifique se `api/save-data.js` está rodando
2. Verifique permissões da pasta `public/data/`
3. Veja console do navegador para erros

```bash
# Verificar permissões
ls -la public/data/

# Corrigir permissões se necessário
chmod 755 public/data/
```

## Produção

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend
    location / {
        root /root/CODEX/mood-pharma-tracker/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Build para Produção

```bash
# Build frontend
npm run build

# Os arquivos ficam em dist/
ls -la dist/
```

### Systemd Service (Opcional)

Crie `/etc/systemd/system/mood-pharma.service`:

```ini
[Unit]
Description=Mood Pharma Tracker API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/CODEX/mood-pharma-tracker
Environment="GEMINI_API_KEY=sua-chave-aqui"
Environment="API_PORT=3001"
ExecStart=/usr/bin/node api/save-data.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Habilitar e iniciar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable mood-pharma
sudo systemctl start mood-pharma
sudo systemctl status mood-pharma
```

## Monitoramento

### Logs do Backend

```bash
# Se usando PM2
pm2 logs matrix-generator
pm2 logs mood-pharma-api

# Se usando systemd
sudo journalctl -u mood-pharma -f
```

### Verificar Uso de Disco

```bash
du -sh public/data/
```

### Limpeza de Backups Antigos

```bash
# Manter apenas últimos 30 dias
find public/data/ -name "app-data-*.json" -mtime +30 -delete
```

## Segurança

1. **NUNCA commite sua API key** ao Git
2. Use HTTPS em produção
3. Configure firewall para permitir apenas portas necessárias
4. Considere rate limiting no Nginx
5. Faça backups regulares dos dados

## Custos Estimados

**Gemini API**:
- Tier gratuito: 15 requisições/minuto
- Tier pago: $0.35 por 1M tokens (entrada) / $1.40 por 1M tokens (saída)
- Cada matriz: ~500 tokens entrada + ~800 tokens saída ≈ $0.001 por matriz
- 1000 testes/mês ≈ $4-5/mês

**Servidor**:
- VPS básico (2GB RAM): $5-10/mês
- Domínio: $10-15/ano
- SSL (Let's Encrypt): Gratuito

---

**Autor**: Anders Barcellos
**Data**: Janeiro 2025
**Versão**: 1.0.0


