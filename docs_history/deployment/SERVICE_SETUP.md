# Mood Pharma Tracker - Systemd Service Setup

## 📋 Service Information

**Service Name:** `mood-pharma-tracker.service`  
**Port:** `8112` (configured in `vite.config.ts`)  
**Status:** ✅ Active and Enabled

## 🚀 Service Configuration

The application runs as a systemd service that:
- ✅ Starts automatically on system boot
- ✅ Restarts automatically if it crashes
- ✅ Runs on port 8112 (127.0.0.1)
- ✅ Logs to systemd journal
- ✅ Does not interfere with other services

### Service File Location
```
/etc/systemd/system/mood-pharma-tracker.service
```

### Service Configuration
```ini
[Unit]
Description=Mood Pharma Tracker - Vite Development Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/CODEX/mood-pharma-tracker
Environment="NODE_ENV=production"
Environment="PROJECT_ROOT=/root/CODEX/mood-pharma-tracker"
ExecStart=/usr/bin/npm run dev
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=mood-pharma-tracker

[Install]
WantedBy=multi-user.target
```

## 🛠️ Service Management Commands

### Check Service Status
```bash
sudo systemctl status mood-pharma-tracker
```

### Start Service
```bash
sudo systemctl start mood-pharma-tracker
```

### Stop Service
```bash
sudo systemctl stop mood-pharma-tracker
```

### Restart Service
```bash
sudo systemctl restart mood-pharma-tracker
```

### Enable Service (auto-start on boot)
```bash
sudo systemctl enable mood-pharma-tracker
```

### Disable Service (don't auto-start on boot)
```bash
sudo systemctl disable mood-pharma-tracker
```

### View Real-time Logs
```bash
sudo journalctl -u mood-pharma-tracker -f
```

### View Last 100 Log Lines
```bash
sudo journalctl -u mood-pharma-tracker -n 100
```

### View Logs Since Today
```bash
sudo journalctl -u mood-pharma-tracker --since today
```

## 🌐 Apache Integration

The service runs on `127.0.0.1:8112` and is proxied through Apache (vertex configuration).

### Expected Apache Configuration
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:8112/
    ProxyPassReverse / http://127.0.0.1:8112/
    
    # Add WebSocket support for Vite HMR
    RewriteEngine on
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/?(.*) "ws://127.0.0.1:8112/$1" [P,L]
</VirtualHost>
```

### Required Apache Modules
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
sudo systemctl restart apache2
```

## 🔍 Troubleshooting

### Service Won't Start
```bash
# Check for errors
sudo journalctl -u mood-pharma-tracker -n 50

# Verify port is available
ss -tlnp | grep 8112

# Check npm is installed
which npm

# Verify dependencies are installed
cd /root/CODEX/mood-pharma-tracker && npm install
```

### Port Already in Use
```bash
# Find what's using port 8112
sudo lsof -i :8112

# Or with ss
ss -tlnp | grep 8112
```

### Service Keeps Restarting
```bash
# Watch logs in real-time
sudo journalctl -u mood-pharma-tracker -f

# Check for Node.js errors
cd /root/CODEX/mood-pharma-tracker
npm run dev  # Test manually
```

### High Memory Usage
The Vite dev server uses ~1GB of RAM, which is normal. If this is a concern:
1. Build for production: `npm run build`
2. Serve static files via Apache/Nginx instead
3. Modify service to use `npm run preview` instead of `npm run dev`

## 📊 Monitoring

### Check if Service is Running
```bash
systemctl is-active mood-pharma-tracker
# Expected output: active
```

### Check if Service is Enabled
```bash
systemctl is-enabled mood-pharma-tracker
# Expected output: enabled
```

### View Service Boot Time
```bash
systemd-analyze blame | grep mood-pharma
```

## 🔄 Updating the Application

### After Code Changes
```bash
# Service will auto-reload with Vite HMR
# No restart needed for most changes

# For config changes:
sudo systemctl restart mood-pharma-tracker
```

### After npm Dependencies Change
```bash
cd /root/CODEX/mood-pharma-tracker
npm install
sudo systemctl restart mood-pharma-tracker
```

### Update Service Configuration
```bash
# Edit service file
sudo nano /etc/systemd/system/mood-pharma-tracker.service

# Reload systemd
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart mood-pharma-tracker
```

## 🔒 Security Notes

- Service runs as `root` (consider creating a dedicated user for production)
- Only listens on `127.0.0.1` (not exposed to external network)
- Apache handles SSL/TLS termination
- Consider using a production build with `npm run preview` for better performance

## 📈 Performance

- **Startup Time:** ~350ms
- **Memory Usage:** ~1.1GB (development server)
- **Port:** 8112
- **Auto-restart:** Yes (10 second delay)

## 🎯 Next Steps

1. ✅ Service is running on port 8112
2. ✅ Service starts automatically on boot
3. ⏭️ Configure Apache proxy (vertex) to forward requests to `127.0.0.1:8112`
4. ⏭️ Test the application via Apache proxy
5. ⏭️ Monitor logs for any issues

## 📞 Quick Reference

```bash
# Status check
sudo systemctl status mood-pharma-tracker

# View logs
sudo journalctl -u mood-pharma-tracker -f

# Restart
sudo systemctl restart mood-pharma-tracker

# Check port
ss -tlnp | grep 8112
```

---

**Service Created:** October 21, 2025  
**Last Updated:** October 21, 2025  
**Status:** ✅ Active and Running
