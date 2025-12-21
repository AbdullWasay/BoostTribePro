# How to Run BoostTribePro - Step by Step

## Prerequisites
✅ MongoDB URL configured in `backend/.env`  
✅ Python virtual environment created  
✅ Node.js dependencies installed  

---

## 🚀 Step-by-Step Instructions

### STEP 1: Start the Backend Server

**Open Terminal 1:**

```bash
# Navigate to backend directory
cd /Users/abdulwasay/Documents/Abdul/BoostTribePro/backend

# Activate Python virtual environment
source venv/bin/activate

# Start the FastAPI server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**✅ Success Indicators:**
- You should see "Application startup complete"
- Server should be accessible at http://localhost:8001
- API docs available at http://localhost:8001/docs

**⚠️ If you see MongoDB connection errors:**
- Make sure MongoDB is running
- Verify `MONGO_URL` in `backend/.env` is correct
- Check MongoDB connection string format

---

### STEP 2: Start the Frontend Server

**Open Terminal 2 (keep Terminal 1 running):**

```bash
# Navigate to frontend directory
cd /Users/abdulwasay/Documents/Abdul/BoostTribePro/frontend

# Start the React development server
npm start
```

**Expected Output:**
```
Compiling...
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.
```

**✅ Success Indicators:**
- Browser automatically opens to http://localhost:3000
- You see "Compiled successfully!"
- React app loads in browser

**⚠️ First time compilation takes 30-60 seconds**

---

## 📋 Quick Reference Commands

### Backend Commands:
```bash
# Activate virtual environment
cd backend
source venv/bin/activate

# Run server
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# To stop: Press CTRL+C
```

### Frontend Commands:
```bash
# Navigate to frontend
cd frontend

# Run development server
npm start

# To stop: Press CTRL+C
```

---

## 🌐 Access Points

Once both servers are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend API** | http://localhost:8001 | API endpoints |
| **API Docs** | http://localhost:8001/docs | Interactive API documentation (Swagger) |
| **API Health** | http://localhost:8001/api/health | Health check endpoint |

---

## ✅ Verification Checklist

After starting both servers, verify:

- [ ] Backend shows "Application startup complete"
- [ ] Backend accessible at http://localhost:8001/docs
- [ ] Frontend shows "Compiled successfully!"
- [ ] Frontend accessible at http://localhost:3000
- [ ] No MongoDB connection errors in backend logs
- [ ] Browser opens automatically to frontend

---

## 🛑 Stopping the Servers

To stop either server:
1. Click on the terminal window where the server is running
2. Press `CTRL+C`
3. Wait for the process to stop gracefully

**Important:** Stop backend first, then frontend (or vice versa - order doesn't matter, but stop both before closing terminals)

---

## 🔧 Troubleshooting

### Backend Issues:

**Problem:** MongoDB connection error
```
Solution: Check MONGO_URL in backend/.env
- Format: mongodb://localhost:27017 or mongodb://username:password@host:port/dbname
- Ensure MongoDB is running
```

**Problem:** Port 8001 already in use
```
Solution: 
1. Find process using port: lsof -ti:8001
2. Kill process: kill -9 $(lsof -ti:8001)
3. Or use different port: uvicorn server:app --port 8002
```

**Problem:** Module not found errors
```
Solution:
1. Ensure virtual environment is activated: source venv/bin/activate
2. Reinstall dependencies: pip install -r requirements.txt
```

### Frontend Issues:

**Problem:** Port 3000 already in use
```
Solution:
- React will automatically prompt to use port 3001
- Or kill existing process: lsof -ti:3000 | xargs kill -9
```

**Problem:** Compilation errors
```
Solution:
1. Clear node_modules: rm -rf node_modules package-lock.json
2. Reinstall: npm install --legacy-peer-deps
3. Clear cache: npm start -- --reset-cache
```

**Problem:** Backend connection errors in browser console
```
Solution:
- Verify REACT_APP_BACKEND_URL in frontend/.env is http://localhost:8001
- Check backend is running
- Check CORS_ORIGINS in backend/.env includes http://localhost:3000
```

---

## 📝 Environment Variables Reminder

### Backend (.env)
- `MONGO_URL` - MongoDB connection string ⚠️ REQUIRED
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret key for JWT tokens
- `REACT_APP_BACKEND_URL` - Backend URL (for frontend)
- `OPENAI_API_KEY` - Optional (for AI features)
- `RESEND_API_KEY` - Optional (for emails)
- `STRIPE_API_KEY` - Optional (for payments)

### Frontend (.env)
- `REACT_APP_BACKEND_URL=http://localhost:8001` ✅ Already set

---

## 🎯 Next Steps After Running

1. **Access the application:** Open http://localhost:3000 in your browser
2. **Test API:** Visit http://localhost:8001/docs to explore API endpoints
3. **Create an account:** Use the registration page to create your first user
4. **Explore features:** Navigate through the dashboard and features

---

**Need help?** Check the logs in the terminal windows for error messages.

