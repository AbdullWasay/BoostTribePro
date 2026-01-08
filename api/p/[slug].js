/**
 * Vercel Serverless Function for Product Page Meta Tags
 * This ensures WhatsApp/Facebook crawlers see product-specific meta tags with YouTube thumbnails
 */

export default async function handler(req, res) {
  // Ensure we always return a response
  try {
    const { slug } = req.query;

    if (!slug) {
      const errorHtml = `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Product not found - No slug provided</h1></body></html>`;
      return res.status(404).send(errorHtml);
    }

    // Detect if this is a crawler/bot (especially WhatsApp)
    // WhatsApp uses "facebookexternalhit" or "WhatsApp" in user-agent
    const userAgent = req.headers['user-agent'] || '';
    const isBot = /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|whatsapp|TwitterBot|LinkedInBot|Slackbot|SkypeUriPreview|Applebot|Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot|facebook|twitter|linkedin|slack|skype|Facebot|Meta/i.test(userAgent);
    
    console.log(`[Product Preview] Request from: ${userAgent.substring(0, 200)}`);
    console.log(`[Product Preview] Is bot: ${isBot}`);
    console.log(`[Product Preview] Slug: ${slug}`);

    // Get backend URL from environment - ensure it doesn't have trailing slash
    // In Vercel, we need to use the backend URL from environment variables
    // Priority: REACT_APP_BACKEND_URL > BACKEND_URL > fallback to same domain
    let backendUrl;
    if (process.env.REACT_APP_BACKEND_URL) {
      backendUrl = process.env.REACT_APP_BACKEND_URL;
    } else if (process.env.BACKEND_URL) {
      backendUrl = process.env.BACKEND_URL;
    } else if (process.env.VERCEL_URL) {
      // If on Vercel but no backend URL set, try same domain
      backendUrl = `https://${process.env.VERCEL_URL}`;
    } else if (req.headers.host) {
      // Fallback to same domain as request
      backendUrl = `https://${req.headers.host}`;
    } else {
      // Last resort: localhost (shouldn't happen in production)
      backendUrl = 'http://localhost:8001';
    }
    
    backendUrl = backendUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // If backend URL points to Vercel frontend domain and no explicit backend URL is set,
    // the backend API routes might be on the same domain (monorepo setup)
    // In that case, we'll use the same domain API route (handled in the fallback logic below)
    
    // Build API URL - try backend API first, fallback to same domain API route
    let apiUrl = `${backendUrl}/api/catalog/public/${slug}`;
    
    console.log(`[Product Preview] Backend URL: ${backendUrl}`);
    console.log(`[Product Preview] Fetching from: ${apiUrl}`);
    console.log(`[Product Preview] Environment variables: REACT_APP_BACKEND_URL=${process.env.REACT_APP_BACKEND_URL}, BACKEND_URL=${process.env.BACKEND_URL}`);
    
    // Fetch product data from backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response;
    let product;
    let fetchError = null;
    
    try {
      response = await fetch(apiUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BoostTribe-Preview-Bot/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        product = await response.json();
        console.log(`[Product Preview] Product loaded from primary API: ${product.title}`);
      } else {
        throw new Error(`Backend returned ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      fetchError = error;
      const errorText = response ? await response.text().catch(() => 'Unknown error') : error.message;
      console.error(`[Product Preview] Primary API failed: ${errorText}`);
      console.error(`[Product Preview] API URL that failed: ${apiUrl}`);
      
      // Try fallback: fetch from same domain (in case backend API is on same domain)
      if (req.headers.host && !apiUrl.includes(req.headers.host)) {
        const fallbackApiUrl = `https://${req.headers.host}/api/catalog/public/${slug}`;
        console.log(`[Product Preview] Trying fallback API URL: ${fallbackApiUrl}`);
        
        try {
          const fallbackController = new AbortController();
          const fallbackTimeout = setTimeout(() => fallbackController.abort(), 5000);
          
          const fallbackResponse = await fetch(fallbackApiUrl, {
            signal: fallbackController.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'BoostTribe-Preview-Bot/1.0'
            }
          });
          
          clearTimeout(fallbackTimeout);
          
          if (fallbackResponse.ok) {
            product = await fallbackResponse.json();
            console.log(`[Product Preview] Product loaded from fallback API: ${product.title}`);
            fetchError = null; // Success, clear error
          } else {
            throw new Error(`Fallback also failed with status ${fallbackResponse.status}`);
          }
        } catch (fallbackError) {
          console.error(`[Product Preview] Fallback API also failed: ${fallbackError.message}`);
        }
      }
      
      // If both failed, return error HTML
      if (!product) {
        const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://boost-tribe-pro.vercel.app';
        const errorHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Product Not Found</title>
    <meta property="og:title" content="Product Not Found">
    <meta property="og:description" content="The requested product could not be found. Please ensure REACT_APP_BACKEND_URL or BACKEND_URL environment variable is set in Vercel.">
    <meta property="og:image" content="${baseUrl}/logo512.png">
    <meta property="og:url" content="${baseUrl}/p/${slug}">
    <meta property="og:type" content="product">
</head>
<body>
    <h1>Product Not Found</h1>
    <p>Error: ${errorText}</p>
    <p>API URL tried: ${apiUrl}</p>
    <p>Please ensure REACT_APP_BACKEND_URL or BACKEND_URL environment variable is set in Vercel.</p>
</body>
</html>`;
        return res.status(404).send(errorHtml);
      }
    }
    console.log(`[Product Preview] Product loaded: ${product.title}, image_url: ${product.image_url || 'none'}`);

    // Extract image URL and handle YouTube videos
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://boost-tribe-pro.vercel.app';
    let productImage = `${baseUrl}/logo512.png`; // Default fallback
    
    if (product.image_url) {
      const imageUrl = String(product.image_url).trim();
      console.log(`[Product Preview] Processing image URL: ${imageUrl}`);
      
      // Check if it's a YouTube URL and extract thumbnail
      const youtubeMatch = imageUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\?\s]+)/);
      if (youtubeMatch) {
        const videoId = youtubeMatch[1];
        productImage = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        console.log(`[Product Preview] YouTube thumbnail extracted: ${productImage}`);
      }
      // Check if it's a Vimeo URL
      else if (imageUrl.includes('vimeo.com')) {
        // Vimeo requires API, use fallback
        productImage = `${baseUrl}/logo512.png`;
        console.log(`[Product Preview] Vimeo URL detected, using fallback`);
      }
      // If it's a relative URL, make it absolute
      else if (imageUrl.startsWith('/')) {
        productImage = `${baseUrl}${imageUrl}`;
        console.log(`[Product Preview] Relative URL converted: ${productImage}`);
      }
      // If it's already absolute, use it as is
      else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        productImage = imageUrl;
        console.log(`[Product Preview] Absolute URL used: ${productImage}`);
      }
      // Otherwise, make it absolute
      else {
        productImage = `${baseUrl}/${imageUrl}`;
        console.log(`[Product Preview] Made absolute: ${productImage}`);
      }
    } else {
      console.log(`[Product Preview] No image_url, using default: ${productImage}`);
    }
    
    console.log(`[Product Preview] Final image URL: ${productImage}`);

    // Clean description - remove "none" or empty values
    let description = product.description || '';
    if (description.toLowerCase().trim() === 'none' || description.trim() === '') {
      description = product.title;
    }

    // Build full description with price
    const fullDescription = product.price 
      ? `${description} - ${product.price} ${product.currency}`
      : description || product.title;

    // Build product URL
    const productUrl = `${baseUrl}/p/${slug}`;

    // Escape HTML
    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    // For bots (WhatsApp, Facebook, etc.), serve static HTML with meta tags (no redirect needed)
    // For regular browsers, we need to serve HTML that doesn't break, but ideally redirects to React app
    // However, since we're always routing /p/:slug to this function, we'll serve a minimal HTML
    // The meta tags will be read by WhatsApp before any redirect happens
    const redirectScript = isBot 
      ? '<!-- Bot detected - serving static HTML for crawler - no redirect needed -->' 
      : `<script>
          // For regular browsers, serve the HTML but indicate this is a server-rendered preview
          // The meta tags are already in the DOM for WhatsApp to read
          // Note: This page will redirect, but meta tags are already read by crawlers
          if (typeof window !== 'undefined' && window.location && !window.location.search.includes('_preview=1')) {
            // Don't redirect - just let the page render with meta tags
            // React app should handle this route, but if we're here, serve the preview HTML
          }
        </script>`;

    // Generate HTML with proper OG meta tags
    // IMPORTANT: Meta tags must be in the <head> and before any redirect
    const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(product.title)}</title>
    <meta name="description" content="${escapeHtml(fullDescription)}">
    
    <!-- Open Graph / Facebook / WhatsApp - Critical for link previews -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="${escapeHtml(product.title)}">
    <meta property="og:description" content="${escapeHtml(fullDescription)}">
    <meta property="og:image" content="${escapeHtml(productImage)}">
    <meta property="og:image:url" content="${escapeHtml(productImage)}">
    <meta property="og:image:secure_url" content="${escapeHtml(productImage)}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1280">
    <meta property="og:image:height" content="720">
    <meta property="og:url" content="${escapeHtml(productUrl)}">
    <meta property="og:site_name" content="BoostTribe">
    <meta property="og:locale" content="fr_FR">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(product.title)}">
    <meta name="twitter:description" content="${escapeHtml(fullDescription)}">
    <meta name="twitter:image" content="${escapeHtml(productImage)}">
    
    <!-- Additional meta for better WhatsApp support -->
    <meta name="robots" content="index, follow">
    
    <!-- WhatsApp specific meta tags -->
    <meta property="og:image:alt" content="${escapeHtml(product.title)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    
    <!-- Visible content for crawlers (some crawlers read body content) -->
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; margin: 0; }
        .product-preview { background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .product-image { width: 100%; max-width: 500px; height: auto; border-radius: 4px; display: block; margin: 20px auto; }
        h1 { color: #333; margin-top: 0; }
        p { color: #666; line-height: 1.6; }
        a { color: #007bff; text-decoration: none; }
    </style>
    
    <!-- Redirect script (only for regular browsers, not crawlers) -->
    ${redirectScript}
</head>
<body>
    <!-- Visible content for crawlers and users -->
    <div class="product-preview">
        <h1>${escapeHtml(product.title)}</h1>
        <p>${escapeHtml(fullDescription)}</p>
        <img src="${escapeHtml(productImage)}" alt="${escapeHtml(product.title)}" class="product-image" />
        <p><a href="/p/${slug}">View Product →</a></p>
    </div>
</body>
</html>`;

    // Set proper headers for WhatsApp and other crawlers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // For bots, cache aggressively. For browsers, cache less aggressively
    if (isBot) {
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Add CORS headers if needed (some crawlers check this)
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    console.log(`[Product Preview] HTML generated successfully for ${slug} (Bot: ${isBot})`);
    console.log(`[Product Preview] Image URL: ${productImage}`);
    console.log(`[Product Preview] Product URL: ${productUrl}`);
    
    return res.status(200).send(html);
  } catch (error) {
    console.error('[Product Preview] Error:', error.message);
    console.error('[Product Preview] Stack:', error.stack);
    
    // Return a basic HTML page with default meta tags so WhatsApp can see something
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://boost-tribe-pro.vercel.app';
    const slug = req.query?.slug || 'unknown';
    const errorHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product</title>
    <meta property="og:title" content="Product">
    <meta property="og:description" content="Product page">
    <meta property="og:image" content="${baseUrl}/logo512.png">
    <meta property="og:url" content="${baseUrl}/p/${slug}">
    <meta property="og:type" content="product">
</head>
<body>
    <h1>Error loading product</h1>
    <p>Error: ${error.message}</p>
    <p>Please try again later.</p>
</body>
</html>`;
    return res.status(500).send(errorHtml);
  }
}

