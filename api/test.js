/**
 * Simple test endpoint to verify Vercel serverless functions are working
 */
export default async function handler(req, res) {
  return res.status(200).json({
    message: 'Vercel serverless function is working!',
    timestamp: new Date().toISOString(),
    env: {
      backendUrl: process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'not set'
    }
  });
}


