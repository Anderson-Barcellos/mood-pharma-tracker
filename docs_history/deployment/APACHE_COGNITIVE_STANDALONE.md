# Cognitive Standalone - Apache Exposure

## Contexto do app
- **Entrada Vite dedicada**: `npm run dev:cognitive` sobe `src/dev/cognitive-standalone/index.html` no porto `8115` (ajuste se preferir outro).
- **Ambiente isolado**: UI minimalista para depurar geração de matrizes com Gemini utilizando os mesmos serviços (`requestMatrix`, fallback cacheado etc.) do app principal.
- **Variáveis necessárias**: copiar `.env.example` para `.env` e preencher `VITE_GEMINI_API_KEY`, `VITE_GEMINI_MODEL`, `VITE_GEMINI_API_URL`, `VITE_GEMINI_TIMEOUT_MS` (opcional).

## Execução local como serviço
```bash
# Executa travado em localhost, evita exposição direta
npm run dev:cognitive -- --port 8115 --host 127.0.0.1 --strictPort
```

### Sugestão de systemd
```ini
[Unit]
Description=Cognitive Standalone (Gemini Debug)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/CODEX/mood-pharma-tracker
Environment="NODE_ENV=development"
Environment="PROJECT_ROOT=/root/CODEX/mood-pharma-tracker"
ExecStart=/usr/bin/npm run dev:cognitive -- --port 8115 --host 127.0.0.1 --strictPort
Restart=always
RestartSec=8
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cognitive-standalone

[Install]
WantedBy=multi-user.target
```

Ativa com:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cognitive-standalone
```

## Regra Apache dedicada
### Módulos necessários
```bash
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers
sudo systemctl restart apache2
```

### VirtualHost próprio (recomendado)
```apache
<VirtualHost *:80>
    ServerName cognitive.ultrassom.ai

    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "http"

    ProxyPass        /  http://127.0.0.1:8115/ retry=0 timeout=30 keepalive=On
    ProxyPassReverse /  http://127.0.0.1:8115/

    # WebSocket pass-through (Vite HMR, console overlay etc.)
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:8115/$1" [P,L]

    ErrorLog  ${APACHE_LOG_DIR}/cognitive-standalone-error.log
    CustomLog ${APACHE_LOG_DIR}/cognitive-standalone-access.log combined
</VirtualHost>
```

### Alternativa via sub-path
Se preferir servir em `https://ultrassom.ai/cognitive/`, adicione à config existente:
```apache
ProxyPass        "/cognitive/" "http://127.0.0.1:8115/" retry=0 timeout=30 keepalive=On
ProxyPassReverse "/cognitive/" "http://127.0.0.1:8115/"

RewriteEngine On
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule "^/cognitive/(.*)" "ws://127.0.0.1:8115/$1" [P,L]
```
> Atenção: o build standalone usa paths absolutos (`/src/...`). Se usar sub-path, mantenha também uma regra para `/src/` durante o debug ou ajuste `index.html` para carregar scripts relativos.

### Acesso restrito (opcional)
```apache
<Location />
    AuthType Basic
    AuthName "Cognitive Standalone"
    AuthUserFile /etc/apache2/.htpasswd-cognitive
    Require valid-user
</Location>
```

## Teste pós configuração
1. `systemctl status cognitive-standalone`
2. `curl -I http://127.0.0.1:8115`
3. `curl -I http://cognitive.ultrassom.ai` (ou `.../cognitive/`)
4. Abrir no navegador e validar geração normal/difícil + fallback
*** End Patch***}एका
