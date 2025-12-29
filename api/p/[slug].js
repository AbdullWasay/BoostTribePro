/**
 * Vercel Serverless Function for Product Page Meta Tags
 * This ensures WhatsApp/Facebook crawlers see product-specific meta tags with YouTube thumbnails
 */

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(404).send('Product not found');
  }

  try {
    // Get backend URL from environment - ensure it doesn't have trailing slash
    let backendUrl = process.env.REACT_APP_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8001';
    backendUrl = backendUrl.replace(/\/$/, ''); // Remove trailing slash
    
    // Build API URL
    const apiUrl = `${backendUrl}/api/catalog/public/${slug}`;
    
    console.log(`[Product Preview] Fetching from: ${apiUrl}`);
    
    // Fetch product data from backend with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BoostTribe-Preview-Bot/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`[Product Preview] Backend returned ${response.status} for ${slug}`);
      return res.status(404).send('Product not found');
    }

    const product = await response.json();
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
    
    <!-- Visible content for crawlers (some crawlers read body content) -->
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .product-preview { background: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
        .product-image { width: 100%; max-width: 500px; height: auto; border-radius: 4px; }
    </style>
    
    <!-- Redirect to React app (with delay to allow crawlers to read meta tags) -->
    <script>
        // Only redirect if not a bot/crawler
        const isBot = /bot|crawler|spider|crawling|facebookexternalhit|WhatsApp|TwitterBot|LinkedInBot|Slackbot|SkypeUriPreview|Applebot|Googlebot|bingbot|Baiduspider|YandexBot|DuckDuckBot/i.test(navigator.userAgent);
        if (!isBot) {
            setTimeout(function() {
                if (window.location.hash !== '#no-redirect') {
                    window.location.href = '/p/${slug}';
                }
            }, 1000);
        }
    </script>
    <noscript>
        <meta http-equiv="refresh" content="3; url=/p/${slug}">
    </noscript>
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

    // Set proper headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    
    console.log(`[Product Preview] HTML generated successfully for ${slug}`);
    return res.status(200).send(html);
  } catch (error) {
    console.error('[Product Preview] Error:', error.message);
    console.error('[Product Preview] Stack:', error.stack);
    
    // Return a basic HTML page with default meta tags so WhatsApp can see something
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://boost-tribe-pro.vercel.app';
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
    <p>Error loading product. Please try again later.</p>
</body>
</html>`;
    return res.status(500).send(errorHtml);
  }
}

