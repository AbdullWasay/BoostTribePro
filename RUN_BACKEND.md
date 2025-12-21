# How to Run the Backend Server

## Quick Start

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Activate the virtual environment
**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### 3. Run the server
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

The `--reload` flag enables auto-reload on code changes (useful for development).

## Alternative: Run without reload flag
```bash
uvicorn server:app --host 0.0.0.0 --port 8001
```

## Verify it's running

Once started, you should see output like:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

## Access Points

- **API Base URL**: http://localhost:8001
- **API Documentation (Swagger)**: http://localhost:8001/docs
- **Alternative API Docs (ReDoc)**: http://localhost:8001/redoc

## Prerequisites

1. **MongoDB must be running**
   - The backend connects to MongoDB using the `MONGO_URL` in `backend/.env`
   - Make sure MongoDB is running on the configured URL

2. **Environment variables configured**
   - Check that `backend/.env` exists and has required variables
   - At minimum, `MONGO_URL` and `JWT_SECRET` must be set

## Troubleshooting

### Virtual environment not activated
If you get import errors, make sure the virtual environment is activated. You should see `(venv)` in your terminal prompt.

### Port 8001 already in use
If port 8001 is already in use, either:
- Stop the other process using port 8001
- Or use a different port: `uvicorn server:app --host 0.0.0.0 --port 8002`

### MongoDB connection errors
- Check that MongoDB is running: `mongosh` or check MongoDB service status
- Verify `MONGO_URL` in `backend/.env` is correct
- For MongoDB Atlas, ensure your IP is whitelisted and credentials are correct

### Module not found errors
If you get import errors, install dependencies:
```bash
pip install -r requirements.txt
```

## Stop the server

Press `Ctrl+C` in the terminal where the server is running.

