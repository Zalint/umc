# Server Management Commands

## 🚀 Quick Start

### Option 1: Double-Click (Easiest)
```
Double-click: restart-server.bat
```
This will stop any running server and start fresh.

### Option 2: PowerShell Script
```powershell
.\restart-server.ps1
```

### Option 3: NPM Command
```powershell
npm run restart
```

---

## 📋 All Available Commands

### **Start Server**
```powershell
npm start
```
Starts the server on port 3000

### **Stop Server**
```powershell
npm run stop
```
Or:
```powershell
taskkill /F /IM node.exe
```

### **Restart Server** (Stop + Start)
```powershell
npm run restart
```
Stops any running server and starts fresh

### **Development Mode** (Auto-restart on file changes)
```powershell
npm run dev
```
Uses nodemon to automatically restart when you edit code

---

## 🗂️ Database Commands

### **Run Schema** (Create all tables)
```powershell
npm run db:schema
```

### **Seed Database** (Import data)
```powershell
npm run db:seed
```

---

## 🔧 Troubleshooting

### **Check if Server is Running**
```powershell
netstat -ano | findstr :3000
```

### **Check Node Processes**
```powershell
tasklist | findstr node.exe
```

### **Kill Specific Process**
```powershell
# First find the PID
tasklist | findstr node.exe

# Then kill it
taskkill /F /PID <process_id>
```

### **Check Server Health**
Open browser or use curl:
```powershell
curl http://localhost:3000/api/health
```

---

## 📱 Access URLs

### **Local Access**
- Main App: http://localhost:3000
- API Health: http://localhost:3000/api/health

### **Mobile Access** (Same WiFi)
- Find your IP: `ipconfig`
- Use: http://YOUR-IP:3000

Example: http://192.168.1.100:3000

---

## 🎯 Recommended Workflow

### **During Development**
```powershell
# Use development mode for auto-restart
npm run dev
```
Make changes → Save → Server auto-restarts

### **For Testing**
```powershell
# Use restart script for clean start
npm run restart
```

### **For Production**
```powershell
# Use standard start
npm start
```

---

## ⚡ Quick Reference

| Action | Command |
|--------|---------|
| Start | `npm start` |
| Stop | `npm run stop` |
| Restart | `npm run restart` |
| Dev Mode | `npm run dev` |
| Seed DB | `npm run db:seed` |

---

## 🛑 Emergency Stop

If server won't stop normally:

```powershell
# Nuclear option - kills ALL Node.js processes
taskkill /F /IM node.exe

# Or restart your computer
```

---

## 📝 Notes

- **Port 3000** is the default port
- Change port in `.env` file: `PORT=3000`
- Server must be stopped before restart
- `npm run dev` is best for development
- `npm start` is best for production
- Use `restart-server.bat` for quick double-click restart

---

## ✅ Verification

After starting, check:

1. **Console Output:**
   ```
   ✓ Database connected successfully
   Server running on: http://localhost:3000
   ```

2. **Browser:** Open http://localhost:3000

3. **API:** http://localhost:3000/api/health should return:
   ```json
   {
     "success": true,
     "message": "Server is running"
   }
   ```

