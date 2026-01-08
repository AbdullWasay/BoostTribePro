// Simple test function to verify Vercel functions are working
export default async function handler(req, res) {
  console.log('=== TEST FUNCTION CALLED ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Query:', req.query);
  
  return res.status(200).json({
    message: 'Vercel serverless function is working!',
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });
}
