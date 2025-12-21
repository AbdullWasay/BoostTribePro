# ✅ BoostTribePro - Quick Start Guide

## 🎉 Both Servers Are Running!

### ✅ Fixed Issues:
1. **Backend**: Installed missing `PyJWT` module
2. **Frontend**: Updated `ajv` package to fix dependency error

---

## 🌐 Access Your Application

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | http://localhost:3000 | ✅ Running |
| **Backend API** | http://localhost:8001 | ✅ Running |
| **API Docs** | http://localhost:8001/docs | ✅ Available |

---

## 📝 To Run Manually (Step-by-Step)

### STEP 1: Start Backend

**Open Terminal 1:**
```bash
cd /Users/abdulwasay/Documents/Abdul/BoostTribePro/backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001
INFO:     Application startup complete.
```

### STEP 2: Start Frontend

**Open Terminal 2 (keep Terminal 1 running):**
```bash
cd /Users/abdulwasay/Documents/Abdul/BoostTribePro/frontend
npm start
```

**Expected Output:**
```
Compiled successfully!
You can now view frontend in the browser.
  Local: http://localhost:3000
```

---

## 🛑 To Stop Servers

Press `CTRL+C` in each terminal window where the server is running.

---

## ✅ Verification

### Check Backend:
```bash
curl http://localhost:8001/docs
# Should show HTML content
```

### Check Frontend:
```bash
curl http://localhost:3000
# Should show HTML content
```

### Check if servers are running:
```bash
# Backend
lsof -ti:8001 && echo "Backend is running"

# Frontend
lsof -ti:3000 && echo "Frontend is running"
```

---

## 🔧 Troubleshooting

### If Backend Shows "ModuleNotFoundError":
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
# Or install specific missing package:
pip install PyJWT
```

### If Frontend Shows Dependency Errors:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### If Ports Are Already in Use:
```bash
# Kill process on port 8001
kill -9 $(lsof -ti:8001)

# Kill process on port 3000
kill -9 $(lsof -ti:3000)
```

---

## 📚 Next Steps

1. ✅ Open http://localhost:3000 in your browser
2. ✅ Explore API documentation at http://localhost:8001/docs
3. ✅ Start using the application!

---

**All dependencies are installed and servers are ready to use!** 🚀

