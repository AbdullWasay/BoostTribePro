# Deploying FastAPI Backend to Vercel

## ⚠️ Important Considerations

**Vercel supports Python/FastAPI**, but there are some challenges with your current setup:

1. **MongoDB Connection Pooling**: Serverless functions are stateless and short-lived. Your global MongoDB client connection needs to be adapted for serverless environments.

2. **Cold Starts**: Each serverless function invocation can have cold start delays (1-3 seconds).

3. **Function Timeout**: Vercel has execution time limits (10 seconds on free tier, 60 seconds on Pro).

4. **File Structure**: Need to restructure for Vercel's serverless function format.

## 🚀 Recommended Alternatives (Better Suited for Your App)

Your FastAPI app with MongoDB would work better on:

1. **Railway** - Easy deployment, MongoDB support, no major code changes needed
2. **Render** - Similar to Heroku, supports long-running processes
3. **Fly.io** - Good for Docker-based deployments
4. **DigitalOcean App Platform** - Simple deployment, MongoDB support
5. **AWS Lambda + API Gateway** - If you want serverless (more complex setup)

## 📦 If You Still Want to Use Vercel

### Option 1: Serverless Function Wrapper (Recommended)

Create `api/index.py`:

```python
from mangum import Mangum
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from server import app

# Wrap FastAPI app for serverless
handler = Mangum(app, lifespan="off")
```

### Option 2: Individual Serverless Functions

Create functions for each route endpoint.

### Required Changes

1. **MongoDB Connection Handling**:
   - Use connection pooling per function invocation
   - Don't close connections globally (serverless handles cleanup)

2. **Install mangum**:
   ```bash
   pip install mangum
   ```

3. **Create `vercel.json`**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "api/index.py",
         "use": "@vercel/python"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "api/index.py"
       }
     ]
   }
   ```

4. **Update `requirements.txt`** in root or `api/` folder with all dependencies

5. **Environment Variables**: Set all your env vars in Vercel dashboard

### Challenges You'll Face

- **MongoDB Connection**: Global client won't work well in serverless. Need to initialize per request or use connection pooling library.
- **Background Tasks**: FastAPI BackgroundTasks might not work as expected in serverless
- **File Uploads**: Need special handling for file uploads in serverless
- **WebSockets**: Not supported in Vercel serverless functions

## ✅ Recommendation

**Use Railway or Render instead** - they're much better suited for your FastAPI + MongoDB application and require minimal code changes.

Would you like me to help you set up deployment on Railway or Render instead?

